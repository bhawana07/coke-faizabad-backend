import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
export declare class RolesService {
    private users;
    private roles;
    usersService: UsersService;
    constructor(users: Model<any>, roles: Model<any>, usersService: UsersService);
    addDefaultRoles(): Promise<void>;
    get(): Promise<any[]>;
    update(roleDTO: any): Promise<any>;
    verifyName(): Promise<string>;
    add(roleDTO: any): Promise<any>;
    delete(name: any): Promise<{
        ok?: number;
        n?: number;
    } & {
        deletedCount?: number;
    }>;
    updatePrivileges(): Promise<string>;
    addRole(DTO: any): Promise<any>;
    getRoles(): Promise<any[]>;
    deleteRole(name: any): Promise<{
        ok?: number;
        n?: number;
    } & {
        deletedCount?: number;
    }>;
}
