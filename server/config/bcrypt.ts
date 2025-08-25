// bcrypt configuration for optimal security/performance balance
export const bcryptConfig = {
  // Development: Faster for testing
  development: {
    rounds: 10,
    saltRounds: 10
  },
  // Production: Better security
  production: {
    rounds: 12,
    saltRounds: 12
  },
  // Get current configuration based on environment
  get current() {
    return process.env.NODE_ENV === 'production' 
      ? this.production 
      : this.development;
  }
};

// Helper functions
export const hashPassword = async (password: string): Promise<string> => {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, bcryptConfig.current.rounds);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
};
