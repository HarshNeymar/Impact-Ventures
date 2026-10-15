# Data Dictionary
## Overview
This document describes the schema and data definitions for the BigQuery table used in the wildfire machine learning pipeline.
## BigQuery Table Information
- Project: `code-for-planet`
- Dataset: `wildfire_dataset`
- Table Name: `sequential_events`
- Data Bucket: `data_housee`

## Table Schema
The table below lists each column, its BigQuery data type, nullability mode, and semantic description.
| Column Name | Data Type | Mode | Description |
|------------|-----------|------|-------------|
| global_fire_event_id | STRING | NULLABLE | Identifier linking records to the same fire event across sources. |
| doy | INT64 | NULLABLE | Day of year on which the fire occurred. |
| longitude | FLOAT64 | NULLABLE | Longitude of the fire location. |
| prefire_fuel | FLOAT64 | NULLABLE | Amount of fuel available before the fire (tons/ha). |
| cwd_frac | FLOAT64 | NULLABLE | Fraction of coarse woody debris in fuel. |
| duff_frac | FLOAT64 | NULLABLE | Fraction of duff in fuel. |
| day_of_year_sin | FLOAT64 | NULLABLE | Sine value of day of year |
| fm1000_value | FLOAT64 | NULLABLE | Fuel moisture value (1000-hr fuel). |
| srad_value | FLOAT64 | NULLABLE | Solar radiation value. |
| day_of_year_cos | FLOAT64 | NULLABLE | Cosine value of day of year |
| bi_value | FLOAT64 | NULLABLE | Burn index value. |
| fm100_value | FLOAT64 | NULLABLE | Fuel moisture value (100-hr fuel). |
| rmax_value | FLOAT64 | NULLABLE | Maximum relative humidity. |
| month | FLOAT64 | NULLABLE | Month number of the fire event |
| season | FLOAT64 | NULLABLE | Season Number of the Fire event |
| th_value | FLOAT64 | NULLABLE | Temperature-humidity index. |
| latitude | FLOAT64 | NULLABLE | Latitude of the fire location. |
| rmin_value | FLOAT64 | NULLABLE | Minimum relative humidity. |
| vs_value | FLOAT64 | NULLABLE | Wind speed value. |
| vpd_value | FLOAT64 | NULLABLE | Vapor pressure deficit. |
| sph_value | FLOAT64 | NULLABLE | Specific humidity value. |
| pet_value | FLOAT64 | NULLABLE | Potential evapotranspiration value. |
| tmmn_value | FLOAT64 | NULLABLE | Minimum temperature value. |
| state | STRING | NULLABLE | State of the fire event |
| county | STRING | NULLABLE | County of the fire event |
| covertype | INT64 | NULLABLE | Land cover type classification. |
| fuelcode | INT64 | NULLABLE | Fuel classification code. |
| fuel_moisture_class | INT64 | NULLABLE | Fuel moisture classification. |
| burnday_source | INT64 | NULLABLE | Source of burn day information. |
| BSEV | INT64 | NULLABLE | Burn severity value. |
| duration | INT64 | NULLABLE | Duration of the fire event |

## Notes
- Mode indicates whether a column allows NULL values.
- Descriptions are derived from the curated wildfire data dictionary and aligned to the sequential events schema.
