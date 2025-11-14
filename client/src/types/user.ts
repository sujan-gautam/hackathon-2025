// types/user.ts
import { Types } from 'mongoose';
import { BondStatus } from './bond';

export interface User {
  _id?: string | Types.ObjectId;
  id?: string;
  username: string;
  firstname?: string;
  lastname?: string;
  name?: string;
  email: string;
  password?: string;
  avatar?: string;
  role?: 'user' | 'admin';
  createdAt?: string;
  bio?: string;
  location?: string;
  website?: string;
  isFollowing?: boolean;
  friendRequestStatus?: 'none' | 'pending' | 'accepted' | 'rejected'; // Optional
}