# Dhaka-City-To-Let-Backend-Server
```mermaid
graph TD
    A[Tenant Views Property] --> B{Property Available?}
    B -->|Yes| C[Click 'Book Now']
    B -->|No| Z[Show 'Not Available']
    
    C --> D[Fill Booking Form]
    D --> |Move-in Date<br/>Rental Period<br/>Message to Owner| E[Submit Request]
    
    E --> F[Request Sent to Owner]
    F --> G{Owner Reviews}
    
    G -->|Accept| H[Tenant Gets Notification]
    G -->|Reject| I[Tenant Gets Rejection]
    
    H --> J[Tenant Makes Payment]
    J --> K[Upload Payment Proof]
    
    K --> L[Owner Confirms Payment]
    L --> M[Booking Confirmed! 🎉]
    
    M --> N[Tenant Can Move In]
    
    style A fill:#e1f5ff
    style M fill:#4caf50,color:#fff
    style N fill:#4caf50,color:#fff
    style I fill:#f44336,color:#fff
    style Z fill:#f44336,color:#fff
