'use client';

import { useState, useEffect } from 'react';

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
}

interface BookshelfProps {
  userId: string;
}

export function Bookshelf({ userId }: BookshelfProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${userId}/books`)
      .then(res => res.json())
      .then(data => {
        setBooks(data.books || []);
      })
      .catch(() => {
        setBooks([]);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (books.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Bookshelf</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {books.map(book => (
          <div key={book.id} className="group">
            <div className="aspect-[2/3] bg-gray-100 rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                  <span className="text-3xl">📚</span>
                </div>
              )}
            </div>
            <h3 className="text-sm font-medium text-gray-900 mt-2 truncate">{book.title}</h3>
            <p className="text-xs text-gray-500 truncate">{book.author}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
