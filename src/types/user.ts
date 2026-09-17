export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
  newConfirmPassword: string;
}

export interface ResetPasswordData {
  email: string;
  newPassword: string;
  newConfirmPassword: string;
  token: string;
  uid: string;
}

export interface EditProfileData {
  name: string;
  phone: string;
  company: string;
}

export interface ActivationData {
  token: string;
  email: string;
}

export interface ResendActivationData {
  email: string;
}
