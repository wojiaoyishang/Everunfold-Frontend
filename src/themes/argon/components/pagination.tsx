import { AppLink as Link } from "./navigation-link";
import { Icon } from "./icon";

function href(
  pathname: string,
  current: number,
  query?: string,
  type?: string,
  languages?: string,
) {
  const parameters = new URLSearchParams();
  if (query) parameters.set("q", query);
  if (type) parameters.set("type", type);
  if (languages) parameters.set("languages", languages);
  if (current > 1) parameters.set("page", String(current));
  const search = parameters.toString();
  return `${pathname}${search ? `?${search}` : ""}`;
}

export function Pagination({
  page,
  pages,
  pathname,
  query,
  type,
  languages,
}: {
  page: number;
  pages: number;
  pathname: string;
  query?: string;
  type?: string;
  languages?: string;
}) {
  if (pages <= 1 && page === 1) return null;
  const visible = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((number) => number >= 1 && number <= pages)
    .sort((a, b) => a - b);
  return (
    <nav className="pagination" aria-label="文章分页">
      {page > 1 && (
        <Link
          href={href(pathname, page - 1, query, type, languages)}
          aria-label="上一页"
        >
          <Icon name="chevron-left" />
        </Link>
      )}
      {visible.map((number, index) => (
        <span key={number} className="pagination-group">
          {index > 0 && number - visible[index - 1] > 1 && (
            <span className="pagination-ellipsis">…</span>
          )}
          <Link
            href={href(pathname, number, query, type, languages)}
            className={number === page ? "current" : undefined}
            aria-current={number === page ? "page" : undefined}
          >
            {number}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link
          href={href(pathname, page + 1, query, type, languages)}
          aria-label="下一页"
        >
          <Icon name="chevron" />
        </Link>
      )}
    </nav>
  );
}
