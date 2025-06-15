// StockMarketWidget.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

// ✅ Hardcoded API key (for Finnhub)
const FINNHUB_API_KEY = "d172qipr01qkv5je6li0d172qipr01qkv5je6lig";

// ✅ US stock symbols
const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];

const StockMarketWidget = ({ darkMode }) => {
  const [stocks, setStocks] = useState([]);
  const [marketStatus, setMarketStatus] = useState('Loading...');

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const results = await Promise.all(
          symbols.map(async (symbol) => {
            const res = await axios.get(`https://finnhub.io/api/v1/quote`, {
              params: {
                symbol,
                token: FINNHUB_API_KEY,
              },
            });

            const current = res.data.c;
            const previous = res.data.pc;

            let changePercent;

            if (current && previous) {
              changePercent = ((current - previous) / previous * 100).toFixed(2);
            } else if (previous) {
              changePercent = '0.00';
            } else {
              changePercent = 'N/A';
            }

            return { symbol, change: changePercent };
          })
        );

        setStocks(results);
        setMarketStatus('Live');
      } catch (err) {
        console.error('Error fetching stock data:', err);
        setMarketStatus('Error');
      }
    };

    fetchStocks();
    const interval = setInterval(fetchStocks, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`p-3 rounded-lg shadow ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold">US Stock Market</h2>
        <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
          {marketStatus}
        </span>
      </div>

      <div className="space-y-3">
        {stocks.map((stock) => (
          <div key={stock.symbol} className="flex justify-between items-center">
            <span className="font-medium">{stock.symbol}</span>
            <span className={`text-sm ${
              stock.change === 'N/A' 
                ? (darkMode ? 'text-gray-400' : 'text-gray-500') 
                : stock.change >= 0 
                  ? 'text-green-500' 
                  : 'text-red-500'
            }`}>
              {stock.change === 'N/A' ? 'N/A' : `${stock.change >= 0 ? '+' : ''}${stock.change}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StockMarketWidget;