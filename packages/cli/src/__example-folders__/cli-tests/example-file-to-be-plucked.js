import { sanity, groq } from '..';

sanity.query('QueryKey', groq` *[_type == 'book'].title`);
