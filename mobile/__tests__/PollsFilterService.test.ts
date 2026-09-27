import { PollsFilterService } from '../src/services/PollsFilterService';
import { PollDetailsResponse } from '../src/types';

describe('PollsFilterService Seam', () => {
  let filterService: PollsFilterService;

  const mockPolls: PollDetailsResponse[] = [
    {
      uuid: 'p-open-soon',
      name: 'Best Mascot',
      start_date: '2026-01-01T00:00:00Z',
      close_date: '2026-04-01T00:00:00Z',
      status: 'open',
      choices: [
        { uuid: 'c1', name: 'Otter', poll_uuid: 'p-open-soon' },
        { uuid: 'c2', name: 'Falcon', poll_uuid: 'p-open-soon' },
      ],
    },
    {
      uuid: 'p-open-later',
      name: 'Budget Allocation',
      start_date: '2026-01-01T00:00:00Z',
      close_date: '2026-12-31T23:59:59Z',
      status: 'open',
      choices: [
        { uuid: 'c3', name: 'Parks', poll_uuid: 'p-open-later' },
        { uuid: 'c4', name: 'Roads', poll_uuid: 'p-open-later' },
      ],
    },
    {
      uuid: 'p-closed-old',
      name: '2024 Board Election',
      start_date: '2024-01-01T00:00:00Z',
      close_date: '2024-02-01T00:00:00Z',
      status: 'closed',
      choices: [
        { uuid: 'c5', name: 'Alice', poll_uuid: 'p-closed-old' },
        { uuid: 'c6', name: 'Bob', poll_uuid: 'p-closed-old' },
      ],
    },
    {
      uuid: 'p-closed-recent',
      name: 'Q3 Hackathon Theme',
      start_date: '2026-02-01T00:00:00Z',
      close_date: '2026-03-01T00:00:00Z',
      status: 'closed',
      choices: [
        { uuid: 'c7', name: 'AI Safety', poll_uuid: 'p-closed-recent' },
        { uuid: 'c8', name: 'Green Tech', poll_uuid: 'p-closed-recent' },
      ],
    },
  ];

  beforeEach(() => {
    filterService = new PollsFilterService();
  });

  describe('partitionByStatus', () => {
    it('partitions polls into open and closed buckets', () => {
      const { open, closed } = filterService.partitionByStatus(mockPolls);

      expect(open.map((p) => p.uuid)).toEqual(['p-open-soon', 'p-open-later']);
      expect(closed.map((p) => p.uuid)).toEqual(['p-closed-old', 'p-closed-recent']);
    });
  });

  describe('filterAndSort', () => {
    it('returns only open polls sorted by close_date ascending (closing soonest first)', () => {
      const result = filterService.filterAndSort(mockPolls, { status: 'open' });

      expect(result.map((p) => p.uuid)).toEqual(['p-open-soon', 'p-open-later']);
    });

    it('returns only closed polls sorted by close_date descending (recently closed first)', () => {
      const result = filterService.filterAndSort(mockPolls, { status: 'closed' });

      expect(result.map((p) => p.uuid)).toEqual(['p-closed-recent', 'p-closed-old']);
    });

    it('filters polls by text query matching poll name or choice name', () => {
      const searchByName = filterService.filterAndSort(mockPolls, { query: 'Mascot' });
      expect(searchByName.map((p) => p.uuid)).toEqual(['p-open-soon']);

      const searchByChoice = filterService.filterAndSort(mockPolls, { query: 'Green Tech' });
      expect(searchByChoice.map((p) => p.uuid)).toEqual(['p-closed-recent']);
    });

    it('returns empty array when filter query does not match any poll', () => {
      const result = filterService.filterAndSort(mockPolls, { query: 'NonExistentXYZ' });
      expect(result).toEqual([]);
    });
  });
});
