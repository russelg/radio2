import math
from typing import Any
from typing import Dict
from typing import Iterator
from typing import Optional


class Pagination:
    """
    Helper class to get pagination info

    :param page: current page
    :param per_page: items per page
    :param total_count: total items
    """

    def __init__(self, page: int, per_page: int, total_count: int):
        self.page = page
        self.per_page = per_page
        self.total_count = total_count

    @property
    def pages(self) -> int:
        """
        :returns: total pages
        """
        return max(int(math.ceil(self.total_count / float(self.per_page))), 1)

    @property
    def has_prev(self) -> bool:
        """
        :returns: True if the current page has a previous page, else False
        """
        return self.page > 1

    @property
    def has_next(self) -> bool:
        """
        :returns: True if the current page has a next page, else False
        """
        return self.page < self.pages

    def to_json(self) -> Dict[str, Any]:
        """
        :returns: Pagination info as a dictionary
        """
        return dict(
            self.__dict__,
            pages=self.pages,
            has_prev=self.has_prev,
            has_next=self.has_next,
        )

    def iter_pages(
        self, left_edge=2, left_current=2, right_current=5, right_edge=2
    ) -> Iterator[Optional[int]]:
        """
        :returns: Iterator over all pages, with clipping when too many pages exist
        """
        last = 0
        for num in range(1, self.pages + 1):
            if (
                num <= left_edge
                or (self.page - left_current - 1 < num < self.page + right_current)
                or num > self.pages - right_edge
            ):
                if last + 1 != num:
                    yield None
            yield num
            last = num
