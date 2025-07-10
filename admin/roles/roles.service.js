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
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const users_service_1 = require("../users/users.service");
const path = require("path");
const fs = require("fs");
const config = JSON.parse(fs.readFileSync(path.resolve('./config.json'), 'utf-8'));
const ua = JSON.parse(fs.readFileSync(path.resolve('./ua.json'), 'utf-8'));
let RolesService = class RolesService {
    constructor(users, roles, usersService) {
        this.users = users;
        this.roles = roles;
        this.usersService = usersService;
        this.addDefaultRoles();
    }
    async addDefaultRoles() {
        ua.defaultRoles.forEach(async (role) => {
            const roles = await this.roles.find({ name: role.name });
            if (roles.length === 0) {
                new this.roles(role).save((er, resul) => {
                    if (er)
                        return null;
                });
            }
        });
    }
    async get() {
        return await this.roles.find();
    }
    async update(roleDTO) {
        const result = await this.roles.findOneAndUpdate({ _id: roleDTO.id }, { $set: { privileges: roleDTO.privileges } });
        return result;
    }
    async verifyName() {
        return 'Name Verify';
    }
    async add(roleDTO) {
        if (roleDTO.title) {
            roleDTO.name = roleDTO.title.replace(/ /g, '').toLowerCase();
        }
        return await new this.roles(roleDTO).save();
    }
    async delete(name) {
        return await this.roles.deleteOne({ name });
    }
    async updatePrivileges() {
        return 'updatePrivileges';
    }
    async addRole(DTO) {
        return await new this.roles(DTO).save();
    }
    async getRoles() {
        return await this.roles.find();
    }
    async deleteRole(name) {
        return await this.roles.deleteOne({ name });
    }
};
RolesService = __decorate([
    common_1.Injectable(),
    __param(0, mongoose_2.InjectModel('User')),
    __param(1, mongoose_2.InjectModel('User-Role')),
    __metadata("design:paramtypes", [mongoose_1.Model,
        mongoose_1.Model,
        users_service_1.UsersService])
], RolesService);
exports.RolesService = RolesService;
//# sourceMappingURL=roles.service.js.map