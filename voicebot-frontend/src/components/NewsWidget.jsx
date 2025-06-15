import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ConversationSummary from './ConversationSummary';


const NewsWidget = ({ darkMode, messages, activeLanguage }) => {
  const [news, setNews] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      setIsLoadingNews(true);
      try {
        const res = await axios.get('https://newsdata.io/api/1/news', {
          params: {
            apikey: 'pub_b9b8a5cf4bd846e4ab80bb0753795795', //
            category: 'business',
            language: 'en',
            country: 'in',
          }
        });

        const top3 = res.data.results.slice(0, 3); // Pick top 3 headlines
        setNews(top3);
      } catch (err) {
        console.error('Error fetching news:', err);
      } finally {
        setIsLoadingNews(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <div className={`p-3 rounded-lg shadow ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      <h2 className="font-semibold mb-3">Business Headlines</h2>
      <div className="space-y-3">
        {isLoadingNews ? (
          <p className="text-sm text-gray-400">Loading latest news...</p>
        ) : (
          news.map((item, index) => (
            <div key={index} className="text-sm">
              <p className="font-medium">{item.title}</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {item.source_id}
              </p>
            </div>
          ))
        )}
      </div>
{/* 
      <div className="w-65 lg:w-80 flex flex-col gap-3 h-full">
        <ConversationSummary 
          messages={messages} 
          darkMode={darkMode} 
          activeLanguage={activeLanguage} 
        />
      </div> */}
    </div>
  );
};

export default NewsWidget;