import { WsResponse } from '@nestjs/websockets';
import { UsersService } from './users.service';
export declare class UsersGateway {
    private usersService;
    server: any;
    users: any;
    constructor(usersService: UsersService);
    handleEvent(data: unknown): WsResponse<unknown>;
    handleConnection(client: any): Promise<void>;
}
