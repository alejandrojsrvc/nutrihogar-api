import { Argon2PasswordHasher } from './argon2-password.hasher';

describe('Argon2PasswordHasher', () => {
  it('stores a non-reversible Argon2 hash and verifies it safely', async () => {
    const hasher = new Argon2PasswordHasher();
    const hash = await hasher.hash('password-seguro');

    expect(hash).not.toBe('password-seguro');
    expect(hash).toContain('$argon2id$');
    await expect(hasher.verify(hash, 'password-seguro')).resolves.toBe(true);
    await expect(hasher.verify(hash, 'password-incorrecto')).resolves.toBe(false);
  });
});
