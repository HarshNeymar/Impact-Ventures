# app/imputer_model.py
import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)


class WildfireImputer:
    def __init__(self, df, numeric_cols, geo_block, scaler, knn_index, k=10):
        self.df = df
        self.numeric_cols = numeric_cols
        self.geo_block = geo_block
        self.scaler = scaler
        self.knn_index = knn_index
        self.k = k

    def _rows_for_state(self, state_name):
        """Reference rows for a single state, cached per instance.

        Built lazily rather than in __init__ because trained models are restored
        from a pickle, so anything __init__ sets would be missing on existing
        artifacts. Exact match first (fast vectorised compare); only fall back to
        a normalised compare if that finds nothing.
        """
        if state_name is None or "state" not in self.df.columns:
            return None
        cache = getattr(self, "_state_rows_cache", None)
        if cache is None:
            cache = {}
            object.__setattr__(self, "_state_rows_cache", cache)
        key = str(state_name).strip().lower()
        if key in cache:
            return cache[key]

        rows = self.df.loc[self.df["state"] == state_name]
        if not len(rows):
            norm = getattr(self, "_normalised_state", None)
            if norm is None:
                norm = self.df["state"].astype(str).str.strip().str.lower()
                object.__setattr__(self, "_normalised_state", norm)
            rows = self.df.loc[norm == key]
        cache[key] = rows
        return rows

    def transform(self, user_json, round_risk=False):
        user_df = pd.DataFrame([user_json], columns=self.df.columns)

        temp_num = user_df[self.numeric_cols].fillna(self.df[self.numeric_cols].median())
        temp_num_scaled = self.scaler.transform(temp_num)

        distances, indices = self.knn_index.kneighbors(temp_num_scaled, n_neighbors=self.k)
        neighbor_values = self.df.iloc[indices[0]]

        # numeric fill
        for col in self.numeric_cols:
            if pd.isna(user_df.loc[0, col]):
                user_df.loc[0, col] = neighbor_values[col].mean()

        # geo-block logic
        state_filter = user_json.get("state")
        county_filter = user_json.get("county")

        for col in ("state", "county"):
            if col in user_df.columns:
                user_df[col] = user_df[col].astype("object")

        if state_filter and county_filter:
            if pd.isna(user_json.get("latitude")) or pd.isna(user_json.get("longitude")):
                # Coordinates used to come from the nearest neighbour regardless of the
                # chosen location, so picking Otero/New Mexico returned a point in Nevada.
                # Take them from inside the selected county instead.
                pick = None
                ref = self._rows_for_state(state_filter)
                if ref is not None and len(ref) and "county" in ref.columns:
                    in_county = ref.loc[ref["county"] == county_filter]
                    if not len(in_county):
                        in_county = ref.loc[
                            ref["county"].astype(str).str.strip().str.lower()
                            == str(county_filter).strip().lower()
                        ]
                    if len(in_county):
                        pick = in_county.iloc[0]
                if pick is None:
                    pick = neighbor_values.iloc[0]
                user_df.loc[0, "latitude"] = pick["latitude"]
                user_df.loc[0, "longitude"] = pick["longitude"]
            user_df.loc[0, "state"] = state_filter
            user_df.loc[0, "county"] = county_filter
        elif state_filter:
            # A state supplied WITHOUT a county used to fall into the `else` branch below,
            # which discarded it and took the whole location from the nearest neighbour.
            # That is why picking "New Mexico" could come back as California/Ventura and
            # the assistant then described a county the user never selected.
            # Honour the state, and source the remaining geo fields from inside it.
            ref = self._rows_for_state(state_filter)
            pick = None
            if ref is not None and len(ref):
                target_doy = user_json.get("doy")
                if target_doy is not None and not pd.isna(target_doy) and "doy" in ref.columns:
                    pick = ref.iloc[(ref["doy"] - float(target_doy)).abs().values.argmin()]
                else:
                    pick = ref.iloc[0]
            if pick is None:
                pick = neighbor_values.iloc[0]
            for col in self.geo_block:
                user_df.loc[0, col] = pick[col]
            # the user's choice is authoritative even if no reference row matched
            user_df.loc[0, "state"] = state_filter
        else:
            nearest = neighbor_values.iloc[0]
            for col in self.geo_block:
                user_df.loc[0, col] = nearest[col]

        # derived DOY features
        supplied = lambda key: (
            user_json.get(key) is not None and not pd.isna(user_json.get(key))
        )

        # If the caller sent no doy, the numeric fill above borrowed one from the nearest
        # neighbours, which has nothing to do with the date the user picked: a September
        # request came back with doy 174 (late June), so the map showed fires from the
        # wrong time of year. The UI does send day_of_year_sin/cos (and month), so recover
        # the real doy from those before anything downstream uses it.
        if "doy" in user_df.columns and not supplied("doy"):
            recovered = None
            if supplied("day_of_year_sin") and supplied("day_of_year_cos"):
                angle = float(np.arctan2(float(user_json["day_of_year_sin"]),
                                         float(user_json["day_of_year_cos"])))
                if angle < 0:
                    angle += 2 * np.pi
                recovered = int(round(angle / (2 * np.pi) * 365.25))
            elif supplied("month"):
                recovered = int(pd.Timestamp(2021, int(user_json["month"]), 15).dayofyear)
            if recovered:
                user_df.loc[0, "doy"] = min(366, max(1, recovered))

        if "doy" in user_df.columns and not pd.isna(user_df.loc[0, "doy"]):
            doy = int(round(user_df.loc[0, "doy"]))
            user_df.loc[0, "doy"] = doy
            user_df.loc[0, "day_of_year_sin"] = np.sin(2 * np.pi * doy / 365.25)
            user_df.loc[0, "day_of_year_cos"] = np.cos(2 * np.pi * doy / 365.25)
            # The numeric fill above already borrowed `month` from the neighbours, so a
            # user-supplied doy never reached month/season: doy 252 (September) came back
            # as month 8 / season 3. Derive month from doy whenever the caller gave a doy
            # and did not pin a month themselves.
            if "month" in user_df.columns and (
                pd.isna(user_df.loc[0, "month"]) or (supplied("doy") and not supplied("month"))
            ):
                user_df.loc[0, "month"] = pd.to_datetime(f"2020-{doy}", format="%Y-%j").month
            if "season" in user_df.columns:
                user_df.loc[0, "season"] = (int(user_df.loc[0, "month"]) % 12 // 3) + 1

        # prefire_fuel clip
        if "prefire_fuel" in user_df.columns and not pd.isna(user_df.loc[0, "prefire_fuel"]):
            p99 = self.df["prefire_fuel"].quantile(0.99)
            user_df.loc[0, "prefire_fuel"] = min(user_df.loc[0, "prefire_fuel"], p99)

        # risk
        if "risk" in user_df.columns:
            risk_val = neighbor_values["risk"].mean()
            user_df.loc[0, "risk"] = int(round(risk_val)) if round_risk else risk_val

        # enforce integer categories
        int_cats = ["covertype", "fuelcode", "fuel_moisture_class", "burn_source",
                    "burnday_source", "BSEV", "month", "season", "doy"]
        for col in int_cats:
            if col in user_df.columns and not pd.isna(user_df.loc[0, col]):
                user_df.loc[0, col] = int(round(user_df.loc[0, col]))

        return user_df.iloc[0].to_dict()
