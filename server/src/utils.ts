import bs58 from "bs58";

import { supabase } from "./config";

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ALPHABET_MAP: Record<string, number> = {};
for (let i = 0; i < BASE58_ALPHABET.length; i++) {
  ALPHABET_MAP[BASE58_ALPHABET[i]] = i;
}

export function decodeBase58(str: string) {
  if (typeof bs58.decode === "function") {
    // Use the library if available
    try {
      return bs58.decode(str);
    } catch (err) {
      console.log(
        "bs58.decode error, falling back to custom implementation",
        err
      );
    }
  }

  let result = new Uint8Array(str.length * 2);
  let resultLen = 0;
  let value = 0;
  let carry = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const digit = ALPHABET_MAP[char];

    if (digit === undefined) {
      throw new Error(`Invalid base58 character: ${char}`);
    }

    value = value * 58 + digit;

    let j = 0;
    for (; j < resultLen || value > 0; j++) {
      const newValue = (result[j] || 0) * 58 + value;
      result[j] = newValue & 0xff;
      value = Math.floor(newValue / 256);
    }
    resultLen = j;
  }

  // Count leading zeros in the input
  let inputZeros = 0;
  for (let i = 0; i < str.length && str[i] === "1"; i++) {
    inputZeros++;
  }

  // Create the final result with the correct length
  const finalResult = new Uint8Array(inputZeros + resultLen);

  // Copy result in reverse order
  let j = inputZeros;
  for (let i = 0; i < resultLen; i++) {
    finalResult[j++] = result[resultLen - 1 - i];
  }

  return finalResult;
}

// Helper function to verify user exists
export async function verifyUser(userId: string) {
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(`User verification failed: ${error.message}`);
  }

  return user;
}

// // Auth middleware for protected routes
// export const authenticateJWT = (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const authHeader = req.headers.authorization;

//   if (authHeader) {
//     const token = authHeader.split(" ")[1];

//     jwt.verify(
//       token,
//       process.env.JWT_SECRET || "your-secret-key",
//       (err: any, user: any) => {
//         if (err) {
//           return res.status(403).json({ error: "Invalid or expired token" });
//         }

//         req.user = user;
//         next();
//       }
//     );
//   } else {
//     // Allow the request to proceed without authentication for backwards compatibility
//     // You can make this more strict by uncommenting the line below to reject requests without tokens
//     // return res.status(401).json({ error: 'Authentication token required' });
//     next();
//   }
// };
