'use client'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '3rem 1.5rem'
    }}>
      <div style={{
        maxWidth: '28rem',
        margin: '0 auto'
      }}>
        <div style={{ textAlign: 'center' }}>
          {/* TSA Logo/Brand */}
          <div style={{
            height: '4rem',
            width: '4rem',
            backgroundColor: '#004aad',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.25rem'
          }}>
            TSA
          </div>
          
          {/* 404 Error */}
          <h1 style={{
            fontSize: '3.75rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '1rem'
          }}>
            404
          </h1>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            Page Not Found
          </h2>
          <p style={{
            color: '#6b7280',
            marginBottom: '2rem'
          }}>
            Sorry, we couldn't find the page you're looking for.
          </p>
          
          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <a
              href="/coach"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem 1rem',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
                borderRadius: '0.375rem',
                color: 'white',
                backgroundColor: '#004aad',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#003888'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#004aad'}
            >
              🏠 Go to Dashboard
            </a>
            <button
              onClick={() => window.history.back()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                fontSize: '0.875rem',
                fontWeight: '500',
                borderRadius: '0.375rem',
                color: '#374151',
                backgroundColor: 'white',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 