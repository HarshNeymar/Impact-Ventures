# Wildfire Prediction Platform - Comprehensive Knowledge Base

## Platform Overview

This is a comprehensive wildfire prediction and analysis platform designed to combat climate change through data-driven insights. The platform uses advanced machine learning models trained on over 7.5 million wildfire records spanning 2003-2015 from the USDA Missoula Fire Lab Emissions Inventory (MFLEI) integrated with nearly 4 billion daily weather observations from gridMET.

**Mission**: Help predict, understand, and mitigate wildfire impacts on our climate and communities.

---

## Platform Structure - Three Main Tabs

### 1. Fire Forecast Tab 🔥
**Purpose**: Predict wildfire risk and behavior using real-time data

**Features**:
- **Interactive Risk Heat Map**: Visual representation of wildfire risk across geographic regions
- **Wildfire Prediction**: Users can adjust parameters (fuel moisture, temperature, wind speed, etc.) to forecast fire behavior
- **Fire Data Points on Map**: Clickable markers showing historical and current fire events
- **Analyze-Fire Endpoint**: When users click a fire marker, they get AI-powered explanations about:
  - Fire danger index
  - Fuel moisture levels
  - Predicted duration
  - Environmental risk factors
  - Management recommendations
- **Follow-up Questions**: Users can ask additional questions about specific fires

**Key KPIs Displayed**:
- Fire Danger Index (BI)
- Fuel Moisture (fm100, fm1000)
- Predicted Fire Duration
- End Tomorrow Probability
- Wind Speed
- Temperature ranges
- Burn Severity (BSEV)

---

### 2. Emissions Tab 💨
**Purpose**: Understand the environmental impact of past wildfires

**Features**:
- **Emissions Bubble Map**: Interactive map where bubble size and darkness indicate emission levels
  - Bigger bubbles = more emissions
  - Darker bubbles = higher pollution concentration
- **Pollutant Data**: Shows amount of greenhouse gases released by historical fires
- **Analyze-Emissions Endpoint**: When users click a bubble, they get explanations about:
  - CO₂ (Carbon Dioxide) emissions
  - CO (Carbon Monoxide) levels
  - CH₄ (Methane) released
  - PM2.5 (Particulate Matter) pollution
  - Environmental and health impacts
- **Follow-up Questions**: Users can explore emission patterns and climate impacts

**Key Metrics**:
- ECO2: Carbon dioxide emissions (major greenhouse gas)
- ECO: Carbon monoxide levels (toxic gas)
- ECH4: Methane emissions (potent greenhouse gas)
- EPM2_5: Fine particulate matter (air quality hazard)

---

### 3. Behind the Scenes Tab 📊
**Purpose**: Transparency into the ML models and training data

**Features**:
- **ML Model Statistics**: Performance metrics of prediction models
- **Training Data Visualizations**: 4-5 charts showing:
  - Feature correlations
  - Model accuracy metrics (R², MAE, RMSE)
  - Feature importance rankings
  - Survival probability curves
  - Geographic distribution of training fires
  - Seasonal patterns in fire occurrence
- **Data Quality Insights**: How the models were validated
- **Model Approaches**: Comparison of different prediction methods

**Charts Included**:
1. Feature Correlation Heatmap
2. Top 10 Feature Importance
3. Survival Probability Curves (500 fires)
4. Seasonality of Fire Duration
5. Geographic Distribution by State
6. Risk Category Distribution
7. Model Performance Comparison

---

## Key Performance Indicators (KPIs) Explained

### Fire Behavior KPIs

**Fire Danger Index (BI)**
- Composite measure of fire danger from 0-100
- Combines weather and fuel data
- Higher values = extreme fire risk
- Above 50 indicates very high danger

**Fuel Moisture (fm100, fm1000)**
- fm100: 100-hour dead fuel moisture (%)
- fm1000: 1000-hour dead fuel moisture (%)
- Lower values = drier fuels = higher fire risk
- Critical threshold: below 10% is extremely dangerous

**Predicted Duration**
- How many days the fire is expected to burn
- Based on fuel availability and weather conditions
- Average US wildfire: 5-7 days
- Long-duration fires (>15 days) are rare but severe

**End Tomorrow Probability**
- Probability that fire will extinguish within 24 hours
- Values closer to 1.0 = likely to end soon
- Values closer to 0.0 = will persist for days

**Burn Severity (BSEV)**
- Scale 1-5 indicating fire intensity
- 1-2: Low severity (ground fire)
- 3-4: Moderate to high (crown fire)
- 5: Extreme severity (complete consumption)

### Weather KPIs

**Wind Speed (vs_value)**
- Measured in mph or m/s
- Higher winds = faster fire spread
- Critical factor in fire behavior
- Above 20 mph becomes very dangerous

**Temperature (tmmx, tmmn)**
- tmmx: Daily maximum temperature
- tmmn: Daily minimum temperature
- Higher temps = increased fire risk
- Heat waves create extreme conditions

**Humidity (rmin, rmax)**
- rmin: Minimum relative humidity (%)
- rmax: Maximum relative humidity (%)
- Lower humidity = drier fuels
- Below 15% RH is critical

**Vapor Pressure Deficit (VPD)**
- Measures atmospheric drying power
- Higher VPD = rapid moisture loss from fuels
- Strong predictor of fire behavior

**Solar Radiation (srad_value)**
- Amount of sunlight energy
- Affects fuel temperature and dryness
- Higher radiation = increased fire risk

### Fuel Characteristics

**Prefire Fuel Load**
- Estimated biomass before ignition (tons/hectare)
- More fuel = longer burning
- Key factor in fire duration

**Coarse Woody Debris Fraction (cwd_frac)**
- Proportion of large woody material
- Can smolder for days
- Affects fire persistence

**Duff Fraction (duff_frac)**
- Partially decomposed organic layer
- Smolders slowly
- Important for long-duration fires

**Cover Type / Fuel Code**
- Vegetation classification
- Different fuels burn differently
- Influences fire intensity and spread

---

## Emissions and Climate Impact

### Understanding Wildfire Emissions

**Why Emissions Matter**:
- Wildfires are a growing contributor to climate change
- Create feedback loop: climate change → more fires → more emissions → more climate change
- In some regions, wildfire emissions exceed fossil fuel emissions 2-3 times

**Carbon Dioxide (CO₂)**
- Primary greenhouse gas
- Long atmospheric lifetime
- Contributes directly to global warming

**Carbon Monoxide (CO)**
- Toxic gas
- Health hazard
- Affects air quality for hundreds of miles

**Methane (CH₄)**
- 28x more potent than CO₂ over 100 years
- Released during incomplete combustion
- Significant climate forcing agent

**Particulate Matter (PM2.5)**
- Fine particles that penetrate deep into lungs
- Causes respiratory and cardiovascular problems
- Can travel thousands of miles
- Impacts air quality and visibility

---

## Machine Learning Models

### Modeling Approaches

**1. Duration Regression (XGBoost)**
- Predicts total fire duration
- R² = 0.74 (explains 74% of variance)
- MAE = 2.8 days
- RMSE = 6.1 days
- Best for planning and resource allocation

**2. Sequential ConvLSTM**
- Captures daily fire-weather dynamics
- R² = 0.66
- MAE = 0.5 days (excellent for short fires)
- Uses temporal sequences
- Better models fire evolution

**3. Hazard-Based Classification**
- Predicts "Will fire end tomorrow?"
- ROC-AUC = 0.93 (excellent discrimination)
- Accuracy = 92.4%
- F1 Score = 0.67
- Most operationally useful

### Top Predictive Features

The most important factors for predicting fire behavior (in order):
1. **Longitude** - Geographic location proxy for climate
2. **Latitude** - Regional vegetation and weather patterns
3. **Duff Fraction** - Ground fuel persistence
4. **1000-hr Fuel Moisture** - Large fuel dryness
5. **Solar Radiation** - Atmospheric heating
6. **100-hr Fuel Moisture** - Medium fuel dryness
7. **Day of Year (Cos/Sin)** - Seasonal patterns
8. **Burn Severity** - Fire intensity
9. **Fire Danger Index** - Composite risk metric
10. **Vapor Pressure Deficit** - Atmospheric drying

---

## Risk Assessment

### Fire Risk Levels (0-10 Scale)

**How Risk is Calculated**:
- Weighted combination of key factors:
  - Temperature (25%)
  - Humidity (20%, inverted)
  - Wind speed (20%)
  - Fuel moisture (20%)
  - Fuel availability (10%)
  - Debris factors (5%)

**Risk Categories**:
- **0-3**: Low Risk (green) - Normal conditions
- **3-5**: Moderate Risk (yellow) - Elevated caution
- **5-7**: High Risk (orange) - Active monitoring needed
- **7-10**: Extreme Risk (red) - Emergency response ready

**Distribution**:
- Most areas fall between 2.5-5.5
- Peak concentration around 3.0
- Very few exceed risk level 6

---

## Geographic Patterns

### Regions Most Affected

**Western United States**:
- California, Oregon, Washington
- Highest average fire duration
- Severe seasonal patterns
- Peak season: June-September

**Southwest**:
- Arizona, New Mexico, Texas
- Spring fire season (April-June)
- Monsoon affects summer patterns

**Northern Rocky Mountains**:
- Montana, Idaho, Wyoming
- Late summer fires (July-August)
- Heavily forested areas

**Alaska**:
- Unique boreal forest fires
- Summer lightning storms
- Long-duration events

### Seasonal Patterns

**Spring (March-May)**:
- Southern tier states
- Grass and brush fires
- Moderate duration

**Summer (June-August)**:
- Peak wildfire season nationwide
- Longest duration fires
- Highest severity
- Most emissions

**Fall (September-November)**:
- Western states continue
- Santa Ana wind events in California
- Drought conditions persist

**Winter (December-February)**:
- Lowest fire activity
- Some southern grass fires
- Prescribed burning season

---

## Data Sources and Timeline

### Primary Datasets

**MFLEI (Fire Data)**:
- ~7.5 million fire-day records
- 2003-2015 coverage
- Satellite detection based
- Includes emissions estimates

**GridMET (Weather Data)**:
- ~4 billion daily observations
- 4km resolution
- 2003-2015 coverage
- Comprehensive meteorological variables

**Data Processing**:
- DBSCAN clustering to identify fire events
- Spatiotemporal joining of fire and weather
- Group-aware validation (no data leakage)
- Feature engineering with seasonal harmonics

---

## How to Use the Platform

### For General Users

1. **Explore Risk Heat Map**: See current fire risk in your area
2. **Check Historical Patterns**: Learn about past fires
3. **Understand Emissions**: See environmental impact
4. **Ask Questions**: Use the AI chat for explanations

### For Researchers

1. **Review Model Performance**: Check "Behind the Scenes"
2. **Analyze Feature Importance**: Understand key drivers
3. **Export Data**: Download predictions for analysis
4. **Study Patterns**: Use visualizations for insights

### For Emergency Managers

1. **Monitor Real-Time Risk**: Track current conditions
2. **Predict Fire Duration**: Plan resource deployment
3. **Assess Extinction Probability**: Time suppression efforts
4. **Coordinate Response**: Use survival curves for staging

---

## Climate Change Connection

### Why This Matters

**Growing Fire Frequency**:
- US burned acreage increased from 2-3M acres/year (1980s) to 7M acres/year (2010-2020)
- Climate change intensifies fire conditions
- Longer fire seasons
- More extreme fire behavior

**Feedback Loops**:
- Fires release CO₂ → warming climate
- Warmer climate → drier conditions → more fires
- Permafrost fires release ancient carbon
- Forest conversion reduces carbon sinks

**Human Impacts**:
- Air quality degradation
- Infrastructure destruction
- Ecosystem collapse
- Water supply contamination
- Community displacement

**Our Role**:
- Better prediction enables faster response
- Understanding emissions informs policy
- Data-driven decisions save lives
- Climate mitigation starts with measurement

---

## Technical Details

### Model Training

**Dataset Split**:
- Training: ~5.8 million samples
- Testing: ~1.45 million samples
- Group-aware cross-validation
- No temporal leakage

**Validation Strategy**:
- GroupKFold ensures all days from one fire stay together
- Prevents overfitting
- More realistic generalization
- Conservative performance estimates

**Feature Selection**:
- Correlation analysis (Pearson, Spearman)
- Mutual Information
- ANOVA F-test
- Variance Inflation Factor (VIF)
- Final: 23-27 features selected

### Performance Metrics

**Regression Metrics**:
- R²: Proportion of variance explained
- MAE: Average absolute error (days)
- RMSE: Root mean squared error (days)

**Classification Metrics**:
- Accuracy: Overall correctness
- ROC-AUC: Discrimination ability
- F1: Balance of precision/recall
- Calibration: Probability reliability

---

## Frequently Asked Questions

**Q: How accurate are the predictions?**
A: Our best model explains 74% of variance in fire duration with an average error of 2.8 days. The hazard classifier achieves 92% accuracy in predicting next-day extinction.

**Q: What makes a fire "high risk"?**
A: Combination of low fuel moisture (<10%), high temperatures, low humidity (<15%), strong winds (>15mph), and high fuel loads.

**Q: How do wildfires contribute to climate change?**
A: Through CO₂, methane, and black carbon emissions that warm the atmosphere. In some regions, wildfire emissions equal or exceed fossil fuel emissions.

**Q: Can I use this for my local area?**
A: Yes! Enter your coordinates in the risk map or use the prediction tool with local weather data.

**Q: How often is data updated?**
A: Historical analysis is based on 2003-2015 data. Models can be applied to current weather data for real-time predictions.

**Q: What's the difference between the three modeling approaches?**
A: Duration regression predicts total burn time; ConvLSTM captures daily changes; hazard classification predicts short-term extinction probability. Each serves different operational needs.

**Q: Why focus on fuel moisture?**
A: Fuel moisture is the strongest controllable predictor. Unlike weather (uncontrollable), fuel moisture can be monitored and managed.

**Q: What can individuals do?**
A: Create defensible space, monitor local conditions, follow fire restrictions, report smoke early, support climate action.

---

## Glossary of Terms

**DBSCAN**: Density-Based Spatial Clustering - algorithm used to group fire detections into events

**GridMET**: Gridded Meteorological Data - high-resolution daily weather dataset

**MFLEI**: Missoula Fire Lab Emissions Inventory - comprehensive wildfire detection database

**R²**: Coefficient of determination - how much variance the model explains

**MAE**: Mean Absolute Error - average prediction error magnitude

**RMSE**: Root Mean Squared Error - error metric that penalizes large mistakes

**ROC-AUC**: Area Under Receiver Operating Characteristic Curve - classification performance metric

**VPD**: Vapor Pressure Deficit - atmospheric moisture demand

**ConvLSTM**: Convolutional Long Short-Term Memory - neural network for spatiotemporal sequences

**Group-Aware Validation**: Ensuring all data from one fire stays in the same train/test split

**Hazard Model**: Predicting probability of an event occurring in the next time period

---

## Contact and Support

This platform is designed to make wildfire science accessible to everyone. Whether you're a researcher, emergency manager, policy maker, or concerned citizen, we're here to help you understand and address the wildfire-climate challenge.

**Remember**: Every wildfire prevented, every day of early suppression, every ton of emissions reduced - it all matters in the fight against climate change.

---

*Last Updated: January 2026*
*Data Coverage: 2003-2015*
*Models: XGBoost v2, ConvLSTM, Hazard Classifier*