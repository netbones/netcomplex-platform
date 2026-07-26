import { describe, it, expect } from 'vitest';
import { buildCommentTree, type CommentTreeItem } from '../services';

type CommentTreeNode = CommentTreeItem & { replies: CommentTreeNode[] };

function makeComment(overrides: Partial<CommentTreeItem> & { id: string }): CommentTreeItem {
  return {
    contentId: 'cnt-001',
    authorId: 'usr-001',
    parentId: null,
    rootId: null,
    body: 'hi',
    status: 'PUBLISHED',
    score: 0,
    upvotes: 0,
    downvotes: 0,
    createdAt: new Date('2026-07-26T10:00:00Z'),
    updatedAt: new Date('2026-07-26T10:00:00Z'),
    editedAt: null,
    deletedAt: null,
    author: { id: 'usr-001', name: 'A', avatar: null, profileSlug: 'a' },
    ...overrides,
  };
}

describe('buildCommentTree', () => {
  it('groups flat list into roots + nested replies', () => {
    const flat = [
      makeComment({ id: 'a', parentId: null }),
      makeComment({ id: 'b', parentId: 'a', rootId: 'a' }),
      makeComment({ id: 'c', parentId: 'b', rootId: 'a' }),
      makeComment({ id: 'd', parentId: 'c', rootId: 'a' }),
      makeComment({ id: 'e', parentId: null }),
    ];
    const tree = buildCommentTree(flat) as unknown as CommentTreeNode[];
    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe('a');
    expect(tree[1].id).toBe('e');
    expect(tree[0].replies).toHaveLength(1);
    expect(tree[0].replies[0].id).toBe('b');
    expect(tree[0].replies[0].replies[0].id).toBe('c');
    expect(tree[0].replies[0].replies[0].replies[0].id).toBe('d');
  });

  it('handles depth >= 3', () => {
    const flat = [
      makeComment({ id: 'l0' }),
      makeComment({ id: 'l1', parentId: 'l0', rootId: 'l0' }),
      makeComment({ id: 'l2', parentId: 'l1', rootId: 'l0' }),
      makeComment({ id: 'l3', parentId: 'l2', rootId: 'l0' }),
      makeComment({ id: 'l4', parentId: 'l3', rootId: 'l0' }),
    ];
    const tree = buildCommentTree(flat) as unknown as CommentTreeNode[];
    expect(tree).toHaveLength(1);
    let depth = 0;
    let current: CommentTreeNode = tree[0];
    while (current.replies.length > 0) {
      depth++;
      current = current.replies[0];
    }
    expect(depth).toBe(4);
  });

  it('preserves thread structure when a parent is soft-deleted', () => {
    const flat = [
      makeComment({ id: 'p', deletedAt: new Date() }),
      makeComment({ id: 'c1', parentId: 'p', rootId: 'p' }),
      makeComment({ id: 'c2', parentId: 'c1', rootId: 'p' }),
    ];
    const tree = buildCommentTree(flat) as unknown as CommentTreeNode[];
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('p');
    expect(tree[0].deletedAt).not.toBeNull();
    expect(tree[0].replies).toHaveLength(1);
    expect(tree[0].replies[0].id).toBe('c1');
    expect(tree[0].replies[0].replies[0].id).toBe('c2');
  });

  it('falls back to root-level when parentId is unresolvable (orphan safety)', () => {
    const flat = [
      makeComment({ id: 'root' }),
      makeComment({ id: 'orphan', parentId: 'gone', rootId: 'gone' }),
    ];
    const tree = buildCommentTree(flat);
    expect(tree).toHaveLength(2);
    const ids = tree.map(r => r.id).sort();
    expect(ids).toEqual(['orphan', 'root']);
  });

  it('returns empty tree for empty input', () => {
    expect(buildCommentTree([])).toEqual([]);
  });
});
