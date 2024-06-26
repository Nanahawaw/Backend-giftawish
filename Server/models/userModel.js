import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Declare the Schema of the Mongo model
const userSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: [true, 'firstname is required'],
    },
    lastname: {
      type: String,
      required: [true, 'lastname is required'],
    },
    username: {
      type: String,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, 'email required'],
      unique: true,
      lowercase: true,
    },
    emailIsVerified: {
      type: Boolean,
      default: false,
    },
    phoneNumber: {
      type: String,
    },
    birthday: { type: Date },
    isAdmin: { type: Boolean, default: false },
    profileImage: {
      type: String,
      default:
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8RCNNiXstGEnqykUFUPSwQg1GQlZk2w0EUA&s',
      required: true,
    },
    password: {
      type: String,
      required: [true, 'password required'],
      minlength: [6, 'Too short password'],
    },
    friends: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'blocked'],
          default: 'pending',
        },
      },
    ],
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wishlist',
      },
    ],
    fulfilledWishlists: [
      {
        wishlist: { type: mongoose.Schema.Types.ObjectId, ref: 'Wishlist' },
        fulfilledAt: { type: Date, default: Date.now },
      },
    ],
    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
    },
    addressVisibility: {
      type: Boolean,
      default: false,
    },

    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);
userSchema.pre('save', async function (next) {
  if (this.isModified('password') || this.isNew) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(this.password, salt);
      this.password = hashedPassword;
    } catch (err) {
      next(err);
    }
  }
  next();
});

userSchema.methods.isPasswordMatched = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    throw new Error(`Error comparing passwords: ${error.message}`);
  }
};
const User = mongoose.model('User', userSchema);
export default User;
