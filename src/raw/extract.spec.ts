import { extractResults } from './extract';

describe('extractResults', () => {
  it('uses payload.results when present', () => {
    expect(
      extractResults([
        {
          payload: {
            results: [{ location_id: 1 }, { location_id: 2 }],
          },
        },
      ]),
    ).toEqual([{ location_id: 1 }, { location_id: 2 }]);
  });

  it('keeps the payload when there are no results so it can be quarantined', () => {
    const payload = { Message: 'This is not restaurant page (Talabat).' };
    expect(extractResults([{ payload }])).toEqual([payload]);
  });

  it('keeps the document when payload is missing', () => {
    const doc = { location_id: 1 };
    expect(extractResults([doc])).toEqual([doc]);
  });
});
