This subfolder is used for the development of code for the main processing algorithm that combines radar images and weather data to produce a list of valid storms. This subfolder was created to develop a storm validation logic, as well as to develop the final main processing script to encompass all the code.

1) Development scripts
- `dev.ipynb`


2) Working scripts produced (stored in src folder)
- `storm_object_detector.py` : this script holds the storm validation logic portion
- `main_algo.py` : this script combines all the code into one massive script due to the limitation of AWS Lambda requiring all functions for a script to exist in a single script

The code is written and managed by : Javier