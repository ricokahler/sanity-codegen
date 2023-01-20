import groq from 'groq';

const authorName = groq`author.name`;

export const bookProjection = groq`
  {
    title,
    'authorName': ${authorName},
  }
`;

export { bookProjection as alias };

export default 'book';
