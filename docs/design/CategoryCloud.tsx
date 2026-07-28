'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CategoryCloudProps, WordPressCategory } from '@/types';
import { wordpressApi } from '@/services/wordpress-api';
import { calculateCategoryFontSize } from '@/utils/helpers';

/**
 * Category cloud widget with dynamic font sizing based on post count
 * Uses colored tags from additional.css
 */
const CategoryCloud: React.FC<CategoryCloudProps> = ({
  categories: initialCategories,
  maxFontSize = 24,
  minFontSize = 12,
  className = '',
}) => {
  const [categories, setCategories] = useState<WordPressCategory[]>(initialCategories || []);
  const [isLoading, setIsLoading] = useState(!initialCategories);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialCategories) {
      const fetchCategories = async () => {
        try {
          setIsLoading(true);
          const data = await wordpressApi.getCategories({
            per_page: 50,
            orderby: 'count',
            order: 'desc',
          });
          setCategories(data);
        } catch (err) {
          setError('Failed to load categories');
          console.error('Error fetching categories:', err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchCategories();
    }
  }, [initialCategories]);

  if (isLoading) {
    return <div className="widget category-cloud">Loading categories...</div>;
  }

  if (error) {
    return <div className="widget category-cloud">Error: {error}</div>;
  }

  if (!categories || categories.length === 0) {
    return <div className="widget category-cloud">No categories found.</div>;
  }

  return (
    <div className={`widget category-cloud ${className}`}>
      <h3 className="widget-title">Categories</h3>
      <div className="tagcloud">
        {categories.map((category, index) => {
          const fontSize = calculateCategoryFontSize(
            category,
            categories,
            minFontSize,
            maxFontSize
          );

          // This creates the colored tag effect from additional.css
          // Colors cycle based on index: 9n, 9n+1, 9n+2, etc.
          const colorClass = `category-${index % 9}`;

          return (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className={`tag-link ${colorClass}`}
              style={{
                fontSize: `${fontSize}px`,
                // This ensures the tag cloud styling from additional.css is applied
                display: 'inline-block',
                margin: '0 5px 5px 0',
                padding: '0 6px',
                lineHeight: '30px',
                borderRadius: '5px',
                color: '#FFF',
                opacity: 0.8,
                fontFamily: 'cambria',
              }}
            >
              {category.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryCloud;
