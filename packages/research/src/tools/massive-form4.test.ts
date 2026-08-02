import { describe, expect, it } from 'vitest';

import { MassiveForm4Client } from './massive-form4.js';

describe('MassiveForm4Client', () => {
  it('maps every supported query parameter and normalizes ownership records', async () => {
    let requestedUrl = '';
    const client = new MassiveForm4Client({
      apiKey: 'test-key',
      baseUrl: 'https://api.massive.test',
      fetcher: async (input) => {
        requestedUrl = String(input);
        return new Response(
          JSON.stringify({
            next_url: 'https://api.massive.test/next-page',
            results: [
              {
                accession_number: '0000000000-26-000001',
                aff_10b5_one: true,
                direct_or_indirect: 'I',
                filing_date: '2026-07-15',
                filing_url: 'https://www.sec.gov/Archives/test.txt',
                form_type: '4/A',
                is_director: true,
                is_officer: true,
                issuer_cik: '0000000002',
                issuer_name: 'Test Company',
                nature_of_ownership: 'By Family Trust',
                officer_title: 'Chief Executive Officer',
                owner_cik: '0000000001',
                owner_name: 'Test Insider',
                record_type: 'transaction',
                security_type: 'non-derivative',
                tickers: ['TEST'],
                transaction_acquired_disposed: 'D',
                transaction_code: 'S',
                transaction_date: '2026-07-14',
                transaction_price_per_share: 20,
                transaction_shares: 100,
                transaction_timeliness: 'O',
                transaction_value: 2_000,
              },
            ],
          }),
          { status: 200 },
        );
      },
    });

    const result = await client.getTransactions({
      issuerCik: '0000000002',
      ownerCik: '0000000001',
      ticker: 'test',
      formType: '4/A',
      filingDateFrom: '2026-01-01',
      filingDateTo: '2026-07-31',
      transactionCode: 'S',
      limit: 25,
      sort: 'transaction_value.desc',
    });
    const url = new URL(requestedUrl);

    expect(Object.fromEntries(url.searchParams)).toEqual({
      issuer_cik: '0000000002',
      owner_cik: '0000000001',
      tickers: 'TEST',
      form_type: '4/A',
      'filing_date.gte': '2026-01-01',
      'filing_date.lte': '2026-07-31',
      transaction_code: 'S',
      limit: '25',
      sort: 'transaction_value.desc',
      apiKey: 'test-key',
    });
    expect(result.nextUrl).toBe('https://api.massive.test/next-page');
    expect(result.transactions[0]).toMatchObject({
      planStatus: 'reported_10b5_1',
      ownershipType: 'indirect',
      natureOfOwnership: 'By Family Trust',
      acquiredOrDisposed: 'disposed',
      roles: ['director', 'officer'],
      filingTimeliness: 'on_time',
    });
    expect(result.sources[0]).toMatchObject({
      id: 'sec-form4-0000000000-26-000001',
      sourceType: 'sec_filing',
    });
  });

  it('preserves missing plan and ownership disclosures as unknown states', async () => {
    const client = new MassiveForm4Client({
      apiKey: 'test-key',
      baseUrl: 'https://api.massive.test',
      fetcher: async () =>
        new Response(
          JSON.stringify({
            results: [
              {
                accession_number: '0000000000-26-000002',
                issuer_cik: '0000000002',
                transaction_code: 'P',
              },
            ],
          }),
          { status: 200 },
        ),
    });

    const result = await client.getTransactions({ ticker: 'TEST' });

    expect(result.transactions[0]).toMatchObject({
      planStatus: 'not_disclosed',
      ownershipType: 'not_disclosed',
      filingTimeliness: 'not_disclosed',
    });
    expect(result.sources[0]?.url).toBe(
      'https://www.sec.gov/Archives/edgar/data/2/000000000026000002/0000000000-26-000002.txt',
    );
  });
});
