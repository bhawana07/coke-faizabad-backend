import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { UsersService } from './users/users.service';
export declare class RolesGuard implements CanActivate {
    private reflector?;
    private authService?;
    private usersService?;
    private jwtService?;
    authData: string;
    authKey: string;
    name: string;
    user: object;
    constructor(reflector?: Reflector, authService?: AuthService, usersService?: UsersService, jwtService?: JwtService);
    canActivate(context: ExecutionContext): Promise<any>;
}
