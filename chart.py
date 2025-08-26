import pandas as pd
from lightweight_charts import Chart

if __name__ == '__main__':
    chart = Chart(width=1000, inner_width=0.7, inner_height=1)
    #subchart = chart.create_subchart(width=0.3, height=0.5)
    df = pd.read_csv('ohlcv.csv')
    chart.set(df)
    #subchart.set(df)

    chart.topbar.textbox('my_text_box', 'Hello, Lightweight Charts!')
    chart.show(block=True)