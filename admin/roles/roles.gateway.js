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
exports.RolesGateway = void 0;
const roles_service_1 = require("./roles.service");
const websockets_1 = require("@nestjs/websockets");
let RolesGateway = class RolesGateway {
    constructor(rolesService) {
        this.rolesService = rolesService;
    }
    handleEvent(data) {
        this.rolesService.get().then((roles) => {
            this.roles = roles;
            this.server.emit('data', this.roles);
        });
        const event = 'events';
        return { event, data };
    }
    async handleConnection(client) {
        this.roles = await this.rolesService.get();
        this.server.emit('data', this.roles);
    }
};
__decorate([
    websockets_1.WebSocketServer(),
    __metadata("design:type", Object)
], RolesGateway.prototype, "server", void 0);
__decorate([
    websockets_1.SubscribeMessage('get'),
    __param(0, websockets_1.MessageBody()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Object)
], RolesGateway.prototype, "handleEvent", null);
RolesGateway = __decorate([
    websockets_1.WebSocketGateway({ namespace: '/api/v1/socket/admin/roles' }),
    __metadata("design:paramtypes", [roles_service_1.RolesService])
], RolesGateway);
exports.RolesGateway = RolesGateway;
//# sourceMappingURL=roles.gateway.js.map