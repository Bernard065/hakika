import { Request, Response, NextFunction } from 'express';
import { registerSchema } from '@hakika/shared-dto'; 
import { prisma } from '@hakika/shared-data-access';
import { ValidationError } from '@hakika/shared-utils';

export const userRegistration = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validatedData = registerSchema.parse(req.body); 

        const { email, name } = validatedData;

        const existingUser = await prisma.user.findUnique({ 
            where: { email } 
        });

        if (existingUser) {
            return next(new ValidationError('User already exists'));
        }        
        res.status(201).json({ message: 'User registered' });

    } catch (error) {
        next(error);
    }
};