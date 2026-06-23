'use client';

import { useState, useEffect } from 'react';
import { useSafeTranslation } from '@shared/lib';

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
  viewMode?: 'grid' | 'carousel';
}

export function Bookshelf({
  userId,
  editable = false,
  viewMode: initialViewMode = 'grid',
}: BookshelfProps) {
  const { tx } = useSafeTranslation();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', author: '', coverUrl: '', url: '' });
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'carousel'>(initialViewMode);
  const [selectedIndex, setSelectedIndex] = useState(0);

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
    } catch {
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
    } catch {
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
        <h2 className="text-xl font-semibold text-gray-900">{tx('bookshelf', 'My Bookshelf')}</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
              title="Grid view"
            >
              <i className="fas fa-th-large"></i>
            </button>
            <button
              onClick={() => setViewMode('carousel')}
              className={`p-2 rounded-md ${viewMode === 'carousel' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
              title="Carousel view"
            >
              <i className="fas fa-images"></i>
            </button>
          </div>
          {editable && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              {books.length > 0 ? tx('edit', 'Edit') : tx('addBook', 'Add Books')}
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{tx('addBook', 'Add a Book')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              placeholder={tx('title', 'Title')}
              value={newBook.title}
              onChange={e => setNewBook({ ...newBook, title: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <input
              type="text"
              placeholder={tx('author', 'Author')}
              value={newBook.author}
              onChange={e => setNewBook({ ...newBook, author: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <input
              type="url"
              placeholder={tx('coverUrl', 'Cover Image URL')}
              value={newBook.coverUrl}
              onChange={e => setNewBook({ ...newBook, coverUrl: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <input
              type="url"
              placeholder={tx('bookUrl', 'Book Link (optional)')}
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
              {saving ? tx('saving', 'Saving...') : tx('add', 'Add')}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
            >
              {tx('done', 'Done')}
            </button>
          </div>
        </div>
      )}

      {books.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm mb-4">
            {tx('noBooks', 'No books on the shelf yet.')}
          </p>
          {editable && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
            >
              {tx('addFirstBook', 'Add Your First Book')}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Grid View */}
          {viewMode === 'grid' && (
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

          {/* Carousel View */}
          {viewMode === 'carousel' && (
            <div className="space-y-4">
              {/* Main carousel */}
              <div className="relative bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg overflow-hidden">
                {books.length > 0 && (
                  <div className="aspect-[3/4] max-w-sm mx-auto relative">
                    <a
                      href={books[selectedIndex].url || '#'}
                      target={books[selectedIndex].url ? '_blank' : undefined}
                      rel={books[selectedIndex].url ? 'noopener noreferrer' : undefined}
                      className={`block w-full h-full ${books[selectedIndex].url ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      {books[selectedIndex].coverUrl ? (
                        <img
                          src={books[selectedIndex].coverUrl}
                          alt={books[selectedIndex].title}
                          className="w-full h-full object-cover rounded-lg shadow-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg shadow-lg">
                          <span className="text-5xl">📚</span>
                        </div>
                      )}
                    </a>

                    {/* Navigation arrows */}
                    {books.length > 1 && (
                      <>
                        <button
                          onClick={() =>
                            setSelectedIndex(prev => (prev === 0 ? books.length - 1 : prev - 1))
                          }
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 text-gray-700 rounded-full hover:bg-white shadow-lg transition-all"
                        >
                          <i className="fas fa-chevron-left"></i>
                        </button>
                        <button
                          onClick={() =>
                            setSelectedIndex(prev => (prev === books.length - 1 ? 0 : prev + 1))
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 text-gray-700 rounded-full hover:bg-white shadow-lg transition-all"
                        >
                          <i className="fas fa-chevron-right"></i>
                        </button>
                      </>
                    )}

                    {/* Book counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-sm rounded-full">
                      {selectedIndex + 1} / {books.length}
                    </div>

                    {/* Edit button for carousel */}
                    {isEditing && (
                      <button
                        onClick={() => handleDeleteBook(books[selectedIndex].id)}
                        className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                        title="Remove book"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Book info */}
              {books.length > 0 && (
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {books[selectedIndex].title}
                  </h3>
                  <p className="text-gray-600">{books[selectedIndex].author}</p>
                  {books[selectedIndex].url && (
                    <a
                      href={books[selectedIndex].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mt-2"
                    >
                      <i className="fas fa-external-link-alt"></i>
                      View Book
                    </a>
                  )}
                </div>
              )}

              {/* Thumbnail strip */}
              <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
                {books.map((book, idx) => (
                  <button
                    key={book.id}
                    onClick={() => setSelectedIndex(idx)}
                    className={`shrink-0 w-16 h-24 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === selectedIndex
                        ? 'border-indigo-600 shadow-lg scale-105'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                        <span className="text-lg">📚</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
