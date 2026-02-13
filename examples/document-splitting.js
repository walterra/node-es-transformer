/**
 * Document Splitting Example
 * 
 * Demonstrates how to split one source document into multiple target documents.
 * Useful for creating entity-centric indices (e.g., one tweet → multiple hashtag docs).
 */

const transformer = require('node-es-transformer');

// Example: Split tweets into hashtag-centric documents
transformer({
  sourceIndexName: 'tweets',
  targetIndexName: 'hashtags',
  
  mappings: {
    properties: {
      '@timestamp': {
        type: 'date'
      },
      'tweet_id': {
        type: 'keyword'
      },
      'hashtag': {
        type: 'keyword'
      },
      'text': {
        type: 'text'
      },
      'user': {
        type: 'keyword'
      }
    }
  },
  
  // Return an array to create multiple documents from one source
  transform(tweet) {
    // Skip tweets without hashtags
    if (!tweet.hashtags || tweet.hashtags.length === 0) {
      return null;
    }
    
    // Create one document per hashtag
    return tweet.hashtags.map(hashtag => ({
      tweet_id: tweet.id,
      hashtag: hashtag,
      text: tweet.text,
      user: tweet.user,
      '@timestamp': tweet.created_at
    }));
  }
}).then(() => {
  console.log('Document splitting complete!');
}).catch(err => {
  console.error('Error during document splitting:', err);
});

// Example 2: Split products by category
/*
transformer({
  sourceIndexName: 'products',
  targetIndexName: 'product-by-category',
  
  transform(product) {
    // Product has multiple categories
    if (!product.categories) {
      return null;
    }
    
    // Create one doc per category
    return product.categories.map(category => ({
      product_id: product.id,
      product_name: product.name,
      category: category,
      price: product.price
    }));
  }
});
*/
