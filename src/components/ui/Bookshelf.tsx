'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  url?: string;
}

interface BookshelfProps {
  userId: string;
  editable?: boolean;
}

export function Bookshelf({ userId, editable = false }: BookshelfProps) {
  const { t } = useTranslation();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', author: '', coverUrl: '', url: '' });
  const [saving, setSaving] = useState(false);

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

  const handleAddBook = async () => {
    if (!newBook.title.trim() || !newBook.author.trim()) return;

    setSaving(true);
    const book: Book = {
      id: crypto.randomUUID(),
      title: newBook.title.trim(),
      author: newBook.author.trim(),
      coverUrl: newBook.coverUrl.trim() || undefined,
      url: newBook.url.trim() || undefined,
    };

    try {
      const res = await fetch(`/api/users/${userId}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', book }),
      });
      const data = await res.json();
      setBooks(data.books || [...books, book]);
      setNewBook({ title: '', author: '', coverUrl: '', url: '' });
    } catch (e) {
      setBooks([...books, book]);
    }
    setSaving(false);
  };

  const handleDeleteBook = async (bookId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', bookId }),
      });
      const data = await res.json();
      setBooks(data.books || books.filter(b => b.id !== bookId));
    } catch (e) {
      setBooks(books.filter(b => b.id !== bookId));
    }
    setSaving(false);
  };

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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{t('bookshelf', 'Bookshelf')}</h2>
        {editable && !isEditing && books.length > 0 && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            {t('edit', 'Edit')}
          </button>
        )}
      </div>

      {isEditing && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{t('addBook', 'Add a Book')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              placeholder={t('title', 'Title')}
              value={newBook.title}
              onChange={e => setNewBook({ ...newBook, title: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <input
              type="text"
              placeholder={t('author', 'Author')}
              value={newBook.author}
              onChange={e => setNewBook({ ...newBook, author: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <input
              type="url"
              placeholder={t('coverUrl', 'Cover Image URL')}
              value={newBook.coverUrl}
              onChange={e => setNewBook({ ...newBook, coverUrl: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <input
              type="url"
              placeholder={t('bookUrl', 'Book Link (optional)')}
              value={newBook.url}
              onChange={e => setNewBook({ ...newBook, url: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddBook}
              disabled={saving || !newBook.title.trim() || !newBook.author.trim()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? t('saving', 'Saving...') : t('add', 'Add')}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
            >
              {t('done', 'Done')}
            </button>
          </div>
        </div>
      )}

      {books.length === 0 && !isEditing ? (
        <p className="text-gray-500 text-sm">{t('noBooks', 'No books on the shelf yet.')}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {books.map(book => (
            <div key={book.id} className="group relative">
              <a
                href={book.url || '#'}
                target={book.url ? '_blank' : undefined}
                rel={book.url ? 'noopener noreferrer' : undefined}
                className={`block aspect-[2/3] bg-gray-100 rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-shadow ${book.url ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                    <span className="text-3xl">📚</span>
                  </div>
                )}
              </a>
              {isEditing && (
                <button
                  onClick={() => handleDeleteBook(book.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              )}
              <h3 className="text-sm font-medium text-gray-900 mt-2 truncate">{book.title}</h3>
              <p className="text-xs text-gray-500 truncate">{book.author}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
