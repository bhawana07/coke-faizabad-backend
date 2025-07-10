"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const users_service_1 = require("./users.service");
let UsersGateway = class UsersGateway {
    constructor(usersService) {
        this.usersService = usersService;
    }
    handleEvent(data) {
        this.usersService.get().then((users) => {
            this.users = users;
            this.server.emit('data', users);
        });
        const event = 'events';
        return { event, data };
    }
    async handleConnection(client) {
        this.users = await this.usersService.get();
        this.server.emit('data', this.users);
    }
};
__decorate([
    websockets_1.WebSocketServer(),
    __metadata("design:type", Object)
], UsersGateway.prototype, "server", void 0);
__decorate([
    websockets_1.SubscribeMessage('get'),
    __param(0, websockets_1.MessageBody()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Object)
], UsersGateway.prototype, "handleEvent", null);
UsersGateway = __decorate([
    websockets_1.WebSocketGateway({ namespace: '/api/v1/socket/admin/users' }),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersGateway);
exports.UsersGateway = UsersGateway;
//# sourceMappingURL=users.gateway.js.map