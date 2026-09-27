import { PollDetailsResponse } from '../types';

export interface PollsFilterOptions {
  status?: 'all' | 'open' | 'closed';
  query?: string;
}

export interface PartitionedPolls {
  open: PollDetailsResponse[];
  closed: PollDetailsResponse[];
}

export class PollsFilterService {
  partitionByStatus(polls: PollDetailsResponse[]): PartitionedPolls {
    const open: PollDetailsResponse[] = [];
    const closed: PollDetailsResponse[] = [];

    for (const poll of polls) {
      if (poll.status === 'open') {
        open.push(poll);
      } else if (poll.status === 'closed') {
        closed.push(poll);
      }
    }

    return { open, closed };
  }

  filterAndSort(
    polls: PollDetailsResponse[],
    options: PollsFilterOptions = {}
  ): PollDetailsResponse[] {
    let result = [...polls];

    if (options.status && options.status !== 'all') {
      result = result.filter((p) => p.status === options.status);
    }

    if (options.query && options.query.trim().length > 0) {
      const normalizedQuery = options.query.toLowerCase().trim();
      result = result.filter((p) => {
        const matchesPollName = p.name.toLowerCase().includes(normalizedQuery);
        const matchesChoiceName =
          p.choices?.some((c) => c.name.toLowerCase().includes(normalizedQuery)) ?? false;
        return matchesPollName || matchesChoiceName;
      });
    }

    const parseTime = (dateStr: string) => {
      const time = new Date(dateStr).getTime();
      return isNaN(time) ? 0 : time;
    };

    if (options.status === 'open') {
      result.sort((a, b) => parseTime(a.close_date) - parseTime(b.close_date));
    } else if (options.status === 'closed') {
      result.sort((a, b) => parseTime(b.close_date) - parseTime(a.close_date));
    }

    return result;
  }
}
