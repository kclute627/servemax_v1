/**
 * Generate search terms array for client search
 * Converts all terms to lowercase for case-insensitive searching
 * @param {Object} clientData - The client data object
 * @returns {Array<string>} - Array of unique lowercase search terms
 */
export function generateClientSearchTerms(clientData) {
  const terms = new Set();

  // Add company name and variations
  if (clientData.company_name) {
    const companyName = clientData.company_name.toLowerCase().trim();
    terms.add(companyName);

    // Add individual words from company name (minimum 2 characters)
    companyName.split(/\s+/).forEach(word => {
      if (word.length >= 2) {
        terms.add(word);
      }
    });
  }

  // Add company type
  if (clientData.company_type) {
    terms.add(clientData.company_type.toLowerCase());
    // Also add readable version
    const readableType = clientData.company_type.replace(/_/g, ' ').toLowerCase();
    terms.add(readableType);
  }

  // Add contact names
  if (clientData.contacts && Array.isArray(clientData.contacts)) {
    clientData.contacts.forEach(contact => {
      if (contact.first_name) {
        const firstName = contact.first_name.toLowerCase().trim();
        terms.add(firstName);
      }
      if (contact.last_name) {
        const lastName = contact.last_name.toLowerCase().trim();
        terms.add(lastName);
      }
      // Add full name
      if (contact.first_name && contact.last_name) {
        const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase().trim();
        terms.add(fullName);
      }
      // Add email username (before @)
      if (contact.email) {
        const emailUsername = contact.email.split('@')[0].toLowerCase();
        terms.add(emailUsername);
      }
    });
  }

  // Add address city and state
  if (clientData.addresses && Array.isArray(clientData.addresses)) {
    clientData.addresses.forEach(address => {
      if (address.city) {
        terms.add(address.city.toLowerCase().trim());
      }
      if (address.state) {
        terms.add(address.state.toLowerCase().trim());
      }
    });
  }

  // Convert Set to Array and filter out empty strings
  const finalTerms = Array.from(terms).filter(term => term.length > 0);

  console.log('[SearchTerms] Generated search terms:', finalTerms);

  return finalTerms;
}

/**
 * Check if search query matches any search terms
 * @param {Array<string>} searchTerms - Array of search terms
 * @param {string} query - User's search query
 * @returns {boolean} - True if any term matches the query
 */
export function matchesSearchTerms(searchTerms, query) {
  if (!searchTerms || !Array.isArray(searchTerms) || !query) {
    return false;
  }

  const normalizedQuery = query.toLowerCase().trim();

  // Check if any search term includes the query
  const matches = searchTerms.some(term =>
    term.includes(normalizedQuery) || normalizedQuery.includes(term)
  );

  console.log('[SearchTerms] Match check:', {
    query: normalizedQuery,
    searchTerms,
    matches
  });

  return matches;
}
