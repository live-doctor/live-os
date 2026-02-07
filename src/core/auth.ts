import {
  getCurrentUser,
  hasUsers,
  login,
  logout,
  verifySession,
  type AuthResult,
  type AuthUser,
} from "@/app/actions/auth";

export type AppUser = AuthUser;
export type SignInResult = AuthResult;

export const auth = {
  hasUsers,
  login,
  logout,
  verifySession,
  getCurrentUser,
};
