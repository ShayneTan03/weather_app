import random
import datetime
import pandas as pd
import streamlit as st

from utils import gen_rnd_weather

st.set_page_config(
    page_title="Storm Tracking",
    page_icon="☔️",
    layout="wide",
)

df = gen_rnd_weather(1000) # generates 1000 rows of random data

st.title("Storm Tracking Dashboard")
st.subheader("Comprehensive analysis of historical storms using NEA radar data and weather station information")

l, m1, m2, m3, r = st.columns(5)
if l.button("Radar View", width="stretch"):
    l.markdown("Radar view")
if m1.button("Storm Tracking", width="stretch"):
    m1.markdown("storm tracking")
if m2.button("Feature Analysis", width="stretch"):
    m2.markdown("Feature analysis")
if m3.button("Data Correlation", width="stretch"):
    m3.markdown("Data Correlation")
if r.button("Trend Analysis", width="stretch"):
    r.markdown("Trend analysis")

st.dataframe(df)