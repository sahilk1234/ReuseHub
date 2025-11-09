import { User, CreateUserData, UserProfile } from '../../domain/user/User';
import { UserId } from '../../domain/user/value-objects/UserId';
import { Email } from '../../domain/user/value-objects/Email';
import { LocationData } from '../../domain/user/value-objects/Location';
import { IUserRepository } from '../../infrastructure/repositories/IUserRepository';
import { IAuthenticationService } from '../../infrastructure/services/IAuthenticationService';
import { INotificationService } from '../../infrastructure/services/INotificationService';

export interface RegisterUserCommand {
  email: string;
  displayName: string;
  phone?: string;
  accountType: 'individual' | 'organization';
  location: LocationData;
}

export interface UpdateProfileCommand {
  userId: string;
  displayName?: string;
  phone?: string;
  avatar?: string;
}

export interface UpdateLocationCommand {
  userId: string;
  location: LocationData;
}

export interface VerifyUserCommand {
  userId: string;
  verificationToken: string;
}

export interface RateUserCommand {
  userId: string;
  rating: number;
  reviewerId: string;
}

export interface UserRegistrationResult {
  userId: string;
  verificationEmailSent: boolean;
}

export interface IUserApplicationService {
  registerUser(command: RegisterUserCommand): Promise<UserRegistrationResult>;
  updateUserProfile(command: UpdateProfileCommand): Promise<void>;
  updateUserLocation(command: UpdateLocationCommand): Promise<void>;
  getUserProfile(userId: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  verifyUser(command: VerifyUserCommand): Promise<void>;
  rateUser(command: RateUserCommand): Promise<void>;
  resendVerificationEmail(userId: string): Promise<void>;
  getUsersByLocation(location: LocationData, radiusKm: number): Promise<User[]>;
  searchUsers(searchTerm: string, limit?: number): Promise<User[]>;
}

export class UserApplicationService implements IUserApplicationService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authService: IAuthenticationService,
    private readonly notificationService: INotificationService
  ) {}

  async registerUser(command: RegisterUserCommand): Promise<UserRegistrationResult> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(new Email(command.email));
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create user domain object
    const userData: CreateUserData = {
      email: command.email,
      profile: {
        displayName: command.displayName,
        phone: command.phone,
        isVerified: false, // Users start unverified
        accountType: command.accountType
      },
      location: command.location
    };

    const user = User.create(userData);

    // Save user to repository
    await this.userRepository.save(user);

    // Send verification email
    let verificationEmailSent = false;
    try {
      await this.sendVerificationEmail(user);
      verificationEmailSent = true;
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email fails
    }

    return {
      userId: user.id.value,
      verificationEmailSent
    };
  }

  async updateUserProfile(command: UpdateProfileCommand): Promise<void> {
    const user = await this.getUserById(command.userId);
    
    const currentProfile = user.profile;
    const updatedProfile: UserProfile = {
      ...currentProfile,
      ...(command.displayName && { displayName: command.displayName }),
      ...(command.phone !== undefined && { phone: command.phone }),
      ...(command.avatar !== undefined && { avatar: command.avatar })
    };

    user.updateProfile(updatedProfile);
    await this.userRepository.save(user);
  }

  async updateUserLocation(command: UpdateLocationCommand): Promise<void> {
    const user = await this.getUserById(command.userId);
    user.updateLocation(command.location);
    await this.userRepository.save(user);
  }

  async getUserProfile(userId: string): Promise<User> {
    return await this.getUserById(userId);
  }

  async verifyUser(command: VerifyUserCommand): Promise<void> {
    // In a real implementation, you would validate the verification token
    // For now, we'll assume the token is valid if provided
    if (!command.verificationToken) {
      throw new Error('Verification token is required');
    }

    const user = await this.getUserById(command.userId);
    
    if (user.profile.isVerified) {
      throw new Error('User is already verified');
    }

    const updatedProfile: UserProfile = {
      ...user.profile,
      isVerified: true
    };

    user.updateProfile(updatedProfile);
    
    // Award points for verification
    user.awardPoints(50, 'Account verification');
    
    await this.userRepository.save(user);

    // Send welcome email
    try {
      await this.sendWelcomeEmail(user);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail verification if email fails
    }
  }

  async rateUser(command: RateUserCommand): Promise<void> {
    if (command.rating < 1 || command.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    if (command.userId === command.reviewerId) {
      throw new Error('Users cannot rate themselves');
    }

    const user = await this.getUserById(command.userId);
    const reviewer = await this.getUserById(command.reviewerId);

    // Verify both users can exchange (which includes rating)
    if (!reviewer.canExchangeWith(user)) {
      throw new Error('Reviewer cannot rate this user');
    }

    // Calculate new rating (simple average for now)
    // In a real implementation, you might want to store individual ratings
    const currentRating = user.rating;
    const totalExchanges = user.totalExchanges;
    
    // If this is the first rating, use the new rating
    // Otherwise, calculate weighted average
    let newRating: number;
    if (totalExchanges === 0) {
      newRating = command.rating;
    } else {
      newRating = ((currentRating * totalExchanges) + command.rating) / (totalExchanges + 1);
    }

    user.updateRating(newRating);
    user.incrementExchangeCount();
    
    await this.userRepository.save(user);
  }

  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    
    if (user.profile.isVerified) {
      throw new Error('User is already verified');
    }

    await this.sendVerificationEmail(user);
  }

  async getUsersByLocation(location: LocationData, radiusKm: number): Promise<User[]> {
    const locationObj = new (await import('../../domain/user/value-objects/Location')).Location(location);
    return await this.userRepository.findByLocation(locationObj, radiusKm);
  }

  async searchUsers(searchTerm: string, limit?: number): Promise<User[]> {
    return await this.userRepository.searchByDisplayName(searchTerm, limit);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(new Email(email));
  }

  private async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(new UserId(userId));
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    // Generate verification token (in real implementation, this would be a secure token)
    const verificationToken = this.generateVerificationToken(user.id.value);
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}&userId=${user.id.value}`;

    const subject = 'Welcome to Re:UseNet - Please verify your email';
    const body = `
      <h2>Welcome to Re:UseNet, ${user.profile.displayName}!</h2>
      <p>Thank you for joining our community-based waste exchange network.</p>
      <p>To complete your registration and start exchanging items, please verify your email address by clicking the link below:</p>
      <p><a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email Address</a></p>
      <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
      <p>${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account with Re:UseNet, please ignore this email.</p>
      <p>Happy reusing!<br>The Re:UseNet Team</p>
    `;

    await this.notificationService.sendEmail(user.email.value, subject, body, true);
  }

  private async sendWelcomeEmail(user: User): Promise<void> {
    const subject = 'Welcome to Re:UseNet - Your account is verified!';
    const body = `
      <h2>Congratulations, ${user.profile.displayName}!</h2>
      <p>Your Re:UseNet account has been successfully verified.</p>
      <p>You've earned <strong>50 Eco-Points</strong> for verifying your account!</p>
      <p>You can now:</p>
      <ul>
        <li>Post items you no longer need</li>
        <li>Search for items you want</li>
        <li>Connect with your local community</li>
        <li>Earn Eco-Points for every exchange</li>
      </ul>
      <p><a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Exploring</a></p>
      <p>Happy reusing!<br>The Re:UseNet Team</p>
    `;

    await this.notificationService.sendEmail(user.email.value, subject, body, true);
  }

  private generateVerificationToken(userId: string): string {
    // In a real implementation, this would generate a secure, time-limited token
    // For now, we'll use a simple base64 encoded string with timestamp
    const payload = {
      userId,
      timestamp: Date.now(),
      type: 'email_verification'
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }
}