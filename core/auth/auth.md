# Authentication & Authorization System with RBAC + ABAC

## Objective

Build a secure, scalable authentication and authorization system that supports:

- User authentication (sign-up, sign-in, logout, token refresh)
- Email verification and password recovery
- Role-Based Access Control (RBAC)
- Attribute-Based Access Control (ABAC)
- Security features such as brute force protection and account lockout

---

## 1. Authentication Module

### 1.1 User Registration (Sign Up)

- Input: Name, Email, Password
- Password hashed (e.g., bcrypt or Argon2)
- Store in DB: id, name, email, password_hash, is_verified, created_at
- Send email verification link with token (JWT or UUID)

### 1.2 User Login (Sign In)

- Input: Email, Password
- Verify password
- Check email verification status
- On success: Issue access token (short-lived) + refresh token (long-lived)

### 1.3 Email Verification

- Generate verification token on registration
- Store token with expiry
- Verify token via email click -> set `is_verified=true`

### 1.4 Password Reset / Forgot Password

- User submits email
- Generate and email a reset token
- Store token with expiry
- User sets new password using token

### 1.5 Logout

- Invalidate refresh token (store blacklist or use rotation strategy)

### 1.6 Token Refresh

- Use refresh token to get new access token
- Rotate or invalidate old refresh token

### 1.7 Brute Force Protection / Account Lockout

- Track failed login attempts
- Lock account or IP after N attempts for T minutes
- Use CAPTCHA or rate limiting

---

## 2. Authorization Module

### 2.1 Roles (RBAC)

- Define roles: e.g., `admin`, `manager`, `user`
- Assign role(s) to user
- Roles mapped to permissions

Example:

```json
{
  "admin": ["user:create", "user:read", "user:update", "user:delete"],
  "user": ["profile:read", "profile:update"]
}
```

### 2.2 Attributes (ABAC)

- User/resource attributes used in access decisions
- Examples: `department`, `region`, `resource_owner_id`

### 2.3 Access Decision Logic

- Middleware checks:

  - User has role with required permission (RBAC)
  - AND conditions on attributes match policy (ABAC)

Example:

```json
{
  "permission": "document:read",
  "conditions": {
    "resource.department": "== user.department"
  }
}
```

---

## 3. Token Format

- Use JWTs for access tokens
- Include claims: user ID, email, roles, department, issued_at, expiry
- Sign with strong secret or asymmetric key (RS256)

---

## 4. Technology Stack (Example)

- Backend: Node.js / Go / Python
- DB: PostgreSQL (with JSONB for attribute storage)
- Redis: Token/session blacklist & rate limiting
- Mail: SMTP / 3rd-party (SendGrid)
- Libraries: bcrypt, JWT, OAuth2 library, rate limiter

---

## 5. Future Enhancements

- MFA (TOTP / WebAuthn)
- OAuth2 / SSO support
- Audit logs
- Admin UI for managing roles & attributes

---

## 6. Security Best Practices

- Store hashed passwords only
- Use HTTPS everywhere
- Validate and sanitize all inputs
- Rotate secrets and keys regularly
- Use strong token expiration policies and refresh mechanisms

---

## 7. API & Data Requirements

### New APIs / Endpoints

#### Endpoint: /api/register

- **Method:** POST
- **Params:** name, email, password
- **Response:** 201 Created | 400 Bad Request | 409 Conflict

#### Endpoint: /api/login

- **Method:** POST
- **Params:** email, password
- **Response:** 200 OK (access_token, refresh_token) | 401 Unauthorized

#### Endpoint: /api/verify-email

- **Method:** GET
- **Params:** token (query param)
- **Response:** 200 OK | 400 Invalid/Expired Token

#### Endpoint: /api/request-password-reset

- **Method:** POST
- **Params:** email
- **Response:** 200 OK

#### Endpoint: /api/reset-password

- **Method:** POST
- **Params:** token, new_password
- **Response:** 200 OK | 400 Invalid/Expired Token

#### Endpoint: /api/logout

- **Method:** POST
- **Params:** refresh_token (in body or cookie)
- **Response:** 200 OK

#### Endpoint: /api/refresh-token

- **Method:** POST
- **Params:** refresh_token
- **Response:** 200 OK (new access_token)

#### Endpoint: /api/me

- **Method:** GET
- **Auth Required:** Yes (access token)
- **Response:** User profile

#### Endpoint: /api/introspect

- **Method:** POST
- **Params:** token
- **Response:** 200 OK (active: true/false, user info, roles, attributes) | 400 Invalid Token

### Database Changes

#### Tables

- **users** (id, name, email, password_hash, is_verified, created_at, failed_attempts, locked_until)
- **roles** (id, name, description)
- **user_roles** (user_id, role_id)
- **permissions** (id, name, description)
- **role_permissions** (role_id, permission_id)
- **attributes** (id, user_id, key, value)
- **email_verification_tokens** (id, user_id, token, expires_at)
- **password_reset_tokens** (id, user_id, token, expires_at)
- **refresh_tokens** (id, user_id, token, expires_at, is_revoked)

#### Relationships

- One user can have many roles
- One role can have many permissions
- One user can have many attributes
- Refresh tokens tied to user sessions
- Tokens have expiry and revocation metadata
