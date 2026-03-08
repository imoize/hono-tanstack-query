import { Link } from "react-router-dom";
import { ArrowRight, Tag } from "lucide-react";
import { api } from "@/lib/api.js";
import { Badge } from "@/components/ui/badge.js";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.js";
import { Skeleton } from "@/components/ui/skeleton.js";

// ─── Type extraction ──────────────────────────────────────────────────────────
// $infer['data'] gives us the array type from GET /posts.
// No import from the server, no manual type annotation — pure inference.
type Post = (typeof api.posts.$get.$infer)["data"][number];

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PostCardSkeleton(): React.JSX.Element {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/4 mt-1" />
      </CardHeader>
      <CardContent className="flex-1">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-4 w-24" />
      </CardFooter>
    </Card>
  );
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: Post }): React.JSX.Element {
  const preview =
    post.content.length > 140
      ? post.content.slice(0, 140).trimEnd() + "…"
      : post.content;

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg leading-snug">{post.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {post.author} · {new Date(post.createdAt).toLocaleDateString()}
        </p>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="text-sm text-foreground/80">{preview}</p>
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 text-xs">
              <Tag size={10} />
              {tag}
            </Badge>
          ))}
        </div>
        <Link
          to={`/posts/${post.id}`}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Read <ArrowRight size={14} />
        </Link>
      </CardFooter>
    </Card>
  );
}

// ─── PostList ─────────────────────────────────────────────────────────────────

export function PostList(): React.JSX.Element {
  // api.posts.$get maps to GET /posts.
  // useQuery() is injected by HonoReactQuery — no import from @tanstack/react-query needed.
  // data is typed as Post[] automatically from the server route.
  const { data: posts, isPending, isError, error } = api.posts.$get.useQuery();

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
        <p className="font-medium text-destructive">Failed to load posts</p>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        No posts yet. Create the first one!
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
