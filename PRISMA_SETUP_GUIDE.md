# 🔧 Prisma Setup Guide for Team Members

## Why the Prisma Generated Client is in .gitignore

The `prisma/generated/` folder is **intentionally excluded** from Git for these reasons:

1. ✅ **No merge conflicts** - Generated code varies slightly per environment
2. ✅ **Smaller repository** - Reduces repo size significantly
3. ✅ **Always up-to-date** - Each developer generates based on latest schema
4. ✅ **Best practice** - Recommended by Prisma team

## 🚀 Setup Instructions for Team Members

### First Time Setup

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd STELLARION/back-end
   ```

2. **Install dependencies** (automatically generates Prisma client)

   ```bash
   npm install
   ```

   The `postinstall` script will automatically run `prisma generate`

3. **Verify Prisma client exists**
   ```bash
   ls -la prisma/generated/client/
   ```

### When Schema Changes

If someone updates `prisma/schema.prisma`:

1. **Pull the latest changes**

   ```bash
   git pull
   ```

2. **Regenerate the Prisma client**

   ```bash
   npx prisma generate
   ```

   Or simply run:

   ```bash
   npm install
   ```

### Common Commands

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations
npx prisma migrate dev

# Reset database (dev only)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

## 🐛 Troubleshooting

### Error: "Cannot find module '@prisma/client'"

**Solution:**

```bash
npx prisma generate
```

### Import errors after schema changes

**Solution:**

```bash
# Stop your dev server (Ctrl+C)
npx prisma generate
npm run dev
```

### TypeScript errors about Prisma types

**Solution:**

```bash
# Regenerate and restart TypeScript server
npx prisma generate
# In VS Code: Cmd+Shift+P > "TypeScript: Restart TS Server"
```

## 📋 CI/CD Considerations

For deployment pipelines, ensure you:

1. Run `npm install` (includes postinstall)
2. Or explicitly run `prisma generate` before build
3. Run migrations: `npx prisma migrate deploy`

Example Dockerfile:

```dockerfile
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
```

## ⚠️ Important Notes

- **Never commit** `prisma/generated/` folder
- **Always run** `prisma generate` after pulling schema changes
- **Schema changes** should be communicated to the team
- **Migrations** should be tested locally before pushing

## 🔗 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/prisma-client-generator)
