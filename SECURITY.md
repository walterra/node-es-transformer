# Security Policy

This is a single-person project, so support is best-effort. I'll do my best to address security issues promptly, but response times may vary.

## Reporting a Vulnerability

Found a security issue? Please email the maintainer directly (see `package.json` for contact info) instead of opening a public issue.

Include what you found, how to reproduce it, and any suggestions you have. I'll get back to you within a few days and keep you updated on the fix.

## Security Best Practices

### Elasticsearch Connections

Always use authentication in production:

```javascript
transformer({
  targetClientConfig: {
    node: 'https://elasticsearch.example.com:9200',
    auth: {
      apiKey: process.env.ES_API_KEY  // Never hardcode credentials
    },
    tls: {
      rejectUnauthorized: true
    }
  }
});
```

### Data Handling

- Validate input files before processing
- Sanitize data in transform functions
- Don't log sensitive data
- Be careful with wildcards in `fileName`

### Dependencies

Run `yarn audit` regularly to check for known vulnerabilities in dependencies.
