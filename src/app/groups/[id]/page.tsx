'use client';

import { useParams } from 'next/navigation';
import { authClient, trpc } from '@api/client';

import { Avatar, AvatarFallback, AvatarImage } from '@shared/ui/avatar';
import { AvatarGroup, AvatarGroupCount } from '@shared/ui/avatar-group';
import { Loader2, Plus, User } from 'lucide-react';

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface Member {
  role: string;
  user: { id: string; name: string; image: string | null };
}

export default function GroupDetailPage() {
  const params = useParams() as { id?: string } | null;
  const id = params?.id;
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const { data: envelope, isLoading } = trpc.groups.getGroup.useQuery(
    { id: id! },
    { enabled: !!id }
  );
  const group = envelope?.data as
    | {
        id: string;
        name: string;
        description: string | null;
        category: string;
        isPublic: boolean;
        owner: { id: string; name: string };
        members: Member[];
        contents: {
          id: string;
          title: string;
          excerpt: string | null;
          publishedAt: string | null;
          author: { name: string | null };
        }[];
      }
    | undefined;

  const joinMutation = trpc.groups.joinGroup.useMutation({
    onSuccess: () => utils.groups.getGroup.invalidate({ id: id! }),
  });
  const leaveMutation = trpc.groups.leaveGroup.useMutation({
    onSuccess: () => utils.groups.getGroup.invalidate({ id: id! }),
  });

  const isMember = group?.members?.some(m => m.user.id === session?.user?.id) ?? false;

  const handleJoin = async () => {
    if (!id) return;
    try {
      await joinMutation.mutateAsync({ groupId: id });
    } catch {
      // error handled by tRPC
    }
  };

  const handleLeave = async () => {
    if (!id) return;
    try {
      await leaveMutation.mutateAsync({ groupId: id });
    } catch {
      // error handled by tRPC
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="mx-auto animate-spin" />
      </div>
    );
  }

  if (!group) {
    return <div className="p-8 text-center">Group not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow p-8 mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-800 rounded-full capitalize">
            {group.category?.replace('-', ' ')}
          </span>
          <button
            onClick={isMember ? handleLeave : handleJoin}
            className={`px-6 py-2 rounded-lg font-medium ${
              isMember
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isMember ? 'Leave Group' : 'Join Group'}
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">{group.name}</h1>
        <p className="text-gray-600 mb-6">{group.description || 'No description'}</p>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <AvatarGroup>
              {group.members?.slice(0, 5).map(m => (
                <Avatar key={m.user.id} className="w-8 h-8">
                  <AvatarImage src={m.user.image ?? undefined} alt={m.user.name} />
                  <AvatarFallback>{getInitials(m.user.name)}</AvatarFallback>
                </Avatar>
              ))}
              {(group.members?.length ?? 0) > 5 && (
                <AvatarGroupCount className="w-8 h-8 text-[10px]">
                  +{group.members!.length - 5}
                </AvatarGroupCount>
              )}
            </AvatarGroup>
            <span className="text-gray-500">{group.members?.length ?? 0} members</span>
          </div>
          <span className="flex items-center gap-1">
            <User className="w-4 h-4" />
            Led by {group.owner.name}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Group Posts</h2>
              <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                <Plus className="mr-1" />
                New Post
              </button>
            </div>

            {group.contents && group.contents.length > 0 ? (
              <div className="space-y-4">
                {group.contents.map(post => (
                  <div key={post.id} className="border-b border-gray-100 pb-4">
                    <h3 className="font-semibold text-gray-900">{post.title}</h3>
                    {post.excerpt && <p className="text-sm text-gray-600 mt-1">{post.excerpt}</p>}
                    <div className="text-xs text-gray-500 mt-2">
                      by {post.author?.name} •{' '}
                      {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No posts yet. Be the first to share!</p>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Members</h2>
            <div className="space-y-3">
              {group.members?.map(m => (
                <div key={m.user.id} className="flex items-center">
                  <Avatar className="w-8 h-8 mr-3">
                    <AvatarImage src={m.user.image ?? undefined} alt={m.user.name} />
                    <AvatarFallback className="text-xs font-medium text-indigo-600 bg-indigo-100">
                      {getInitials(m.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{m.role.toLowerCase()}</p>
                  </div>
                </div>
              ))}
            </div>
            {(!group.members || group.members.length === 0) && (
              <p className="text-gray-500 text-sm">No members yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
