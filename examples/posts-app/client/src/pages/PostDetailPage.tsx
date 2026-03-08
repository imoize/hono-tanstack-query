import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Tag } from "lucide-react";
import { api } from "@/lib/api.js";
import { ApiError } from "hono-tanstack-query";
import { Badge } from "@/components/ui/badge.js";
import { Button } from "@/components/ui/button.js";
import { Card, CardContent, CardHeader } from "@/components/ui/card.js";
import { Skeleton } from "@/components/ui/skeleton.js";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PostDetailSkeleton(): React.JSX.Element {
  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

// ─── PostDetailPage ───────────────────────────────────────────────────────────

export function PostDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();

  // api.posts[':id'].$get maps to GET /posts/:id.
  // data is fully typed from the server route — no annotation needed.
  // error is typed as ApiError — .isNotFound() narrows to the 404 branch.
  const {
    data: post,
    isPending,
    isError,
    error,
  } = api.posts[":id"].$get.useQuery({
    param: { id: id! },
    staleTime: 30_000,
  });

  const backLink = (
    <Button variant="ghost" size="sm" asChild className="-ml-2 mb-6">
      <Link to="/">
        <ArrowLeft size={16} />
        All posts
      </Link>
    </Button>
  );

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        {backLink}
        <PostDetailSkeleton />
      </div>
    );
  }

  if (isError) {
    // ApiError.isNotFound() narrows the typed 404 response body.
    const isNotFound = error instanceof ApiError && error.isNotFound();
    console.error("Detail error:", error?.body.message); // Log the full error object for debugging

    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        {backLink}
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-10 text-center">
          <p className="text-xl font-semibold text-destructive">
            {isNotFound ? "Post not found" : "Failed to load post"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {isNotFound ? `No post exists with id "${id}".` : error.message}
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/">Go back</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {backLink}

      <Card>
        <CardHeader>
          <h1 className="text-3xl font-bold leading-tight">{post.title}</h1>
          <p className="text-sm text-muted-foreground">
            By{" "}
            <span className="font-medium text-foreground">{post.author}</span>
            {" · "}
            {new Date(post.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  <Tag size={10} />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent>
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
