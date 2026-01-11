import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';

/**
 * Reusable SearchBar component using Fuse.js for fuzzy search.
 * @param {Object[]} items - Array of objects to search (e.g., [{ id, title, description }])
 * @param {function} onResults - Callback to return filtered results
 * @param {string[]} keys - Keys to search in each object (default: ['title', 'description'])
 * @param {string} placeholder - Input placeholder text
 */
const SearchBar = ({ items, onResults, keys = ['title', 'description'], placeholder = 'Search...' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(items);
  const debounceRef = useRef();

  // Set up Fuse.js
  const fuse = new Fuse(items, {
    keys,
    threshold: 0.4, // typo-tolerant
    ignoreLocation: true,
    minMatchCharLength: 1,
    includeScore: true,
  });

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!query.trim()) {
        setResults(items);
        onResults && onResults(items);
      } else {
        const fuseResults = fuse.search(query.trim());
        const filtered = fuseResults.map(r => r.item);
        setResults(filtered);
        onResults && onResults(filtered);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line
  }, [query, items]);

  return (
    <div className="w-full max-w-md mx-auto">
      <input
        type="text"
        className="w-full border border-slate-300 rounded-lg px-4 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
        placeholder={placeholder}
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <ul className="bg-white rounded-lg shadow divide-y divide-slate-100">
        {results.map(item => (
          <li key={item.id} className="px-4 py-2 hover:bg-slate-50">
            <div className="font-semibold text-slate-800">{item.title}</div>
            <div className="text-slate-500 text-sm">{item.description}</div>
          </li>
        ))}
        {results.length === 0 && (
          <li className="px-4 py-2 text-slate-400">No results found.</li>
        )}
      </ul>
    </div>
  );
};

export default SearchBar;
