import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../config/database'
import { config } from '../../config'
import { LoginInput } from './auth.schema'

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  if (!user || !user.isActive) throw new Error('INVALID_CREDENTIALS')

  const ok = await bcrypt.compare(input.password, user.passwordHash)
  if (!ok) throw new Error('INVALID_CREDENTIALS')

  const token = jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions
  )

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  }
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  })
  if (!user) throw new Error('NOT_FOUND')
  return user
}
