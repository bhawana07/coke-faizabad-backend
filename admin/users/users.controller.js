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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const auth_service_1 = require("../../auth/auth.service");
const path = require("path");
const fs = require("fs");
const config = JSON.parse(fs.readFileSync(path.resolve('./config.json'), 'utf-8'));
let UsersController = class UsersController {
    constructor(usersService, authService) {
        this.usersService = usersService;
        this.authService = authService;
    }
    async get(type) {
        return await this.usersService.get(type);
    }
    async add(userDTO) {
        const users = await this.usersService.get();
        if (users && users.length > config.userLimit) {
            throw new common_1.ForbiddenException('you are exceed limit');
        }
        try {
            const newUser = await this.usersService.add(userDTO).catch((error) => {
                throw new common_1.BadRequestException(error);
            });
            return newUser;
        }
        catch (error) {
            throw new common_1.BadRequestException(error, 'User is not created successfully');
        }
    }
    async getUser(name) {
        return await this.usersService.getUser(name);
    }
    async updateUser(name, userDTO) {
        return await this.usersService.updateUser(name, userDTO);
    }
    async deleteUser(userName) {
        return await this.usersService.deleteUser(userName);
    }
    async getUserRoles(userName) {
        return await this.usersService.getUserRole(userName);
    }
    async updateUserRoles(userName, rolesDTO) {
        try {
            return await this.usersService.updateUserRoles(userName, rolesDTO).catch((error) => {
                throw new common_1.BadRequestException(error);
            });
        }
        catch (error) {
            throw new common_1.BadRequestException(error, 'User is not created successfull');
        }
    }
    async updatePrivileges(userName, privilegesDTO) {
        return await this.usersService.updatePrivileges(userName, privilegesDTO);
    }
    async getPrivileges(userName) {
        return await this.usersService.getPrivileges(userName);
    }
    async updatePrivilegesSchedule(userName, privilegesScheduleDTO) {
        return await this.usersService.updatePrivilegesSchedule(userName, privilegesScheduleDTO);
    }
    async updateProfilePic(userName, profilePicDTO) {
        return await this.usersService.updateProfilePic(userName, profilePicDTO);
    }
    async getProfilePic(userName) {
        return await this.usersService.getProfilePic(userName);
    }
    async updateHomeRoute(userName, homeRouteDTO) {
        return await this.usersService.updateHomeRoute(userName, homeRouteDTO);
    }
    async getHomeRoute(userName) {
        return await this.usersService.getHomeRoute(userName);
    }
    async updateProfile(userName, profileDto) {
        return await this.usersService.updateProfile(userName, profileDto);
    }
    async updateFullName(userName, fullName) {
        return await this.usersService.updateFullName(userName, fullName);
    }
    async updateProfileName(userName, profileNameDTO) {
        return await this.usersService.updateProfileName(userName, profileNameDTO);
    }
    async updateAddress(userName, AddressDTO) {
        return await this.usersService.updateAddress(userName, AddressDTO);
    }
    async updatePhoneNumber(userName, phoneNumberDTO) {
        return await this.usersService.updatePhoneNumber(userName, phoneNumberDTO);
    }
    async updateEmail(userName, alternetEmailDTO) {
        return await this.usersService.updateEmail(userName, alternetEmailDTO);
    }
    async activate(userName) {
        return await this.usersService.activate(userName);
    }
    async dective(userName) {
        return await this.usersService.deactivate(userName);
    }
    async updateActivation(userName) {
        return await this.usersService.toggleActivation(userName);
    }
    async updateMaritalStatus(userName, user) {
        return await this.usersService.updateMaritalStatus(userName);
    }
    async isActive(userName, user) {
        return await this.usersService.isActive(userName);
    }
    async isLocked(userName, user) {
        return await this.usersService.isLocked(userName);
    }
    async lock(userName, user) {
        return await this.usersService.lock(userName);
    }
    async unlock(userName, user) {
        return await this.usersService.unlock(userName);
    }
    async getAuthStatus(userName) {
        return await this.usersService.getAuthStatus(userName);
    }
    async getAccessRoutes(userName) {
        return await this.usersService.getAccessRoutes(userName);
    }
    async isOnline(userName) {
        return await this.usersService.isOnline(userName);
    }
    async getActivities(userName) {
        return await this.usersService.getActivities(userName);
    }
    async addActivity(userName, activityDTO) {
        return await this.usersService.addActivity(userName, activityDTO);
    }
    async changePassword(userName, user) {
        return await this.usersService.changePassword(userName);
    }
};
__decorate([
    common_1.Get(),
    __param(0, common_1.Query('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "get", null);
__decorate([
    common_1.Post(),
    __param(0, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "add", null);
__decorate([
    common_1.Get(':name'),
    __param(0, common_1.Param('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUser", null);
__decorate([
    common_1.Post(':name'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateUser", null);
__decorate([
    common_1.Delete(':name'),
    __param(0, common_1.Param('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteUser", null);
__decorate([
    common_1.Get(':name/roles'),
    __param(0, common_1.Param('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUserRoles", null);
__decorate([
    common_1.Post(':name/roles'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateUserRoles", null);
__decorate([
    common_1.Post(':name/privileges'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updatePrivileges", null);
__decorate([
    common_1.Get(':name/privileges'),
    __param(0, common_1.Param('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getPrivileges", null);
__decorate([
    common_1.Post(':name/schedule'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updatePrivilegesSchedule", null);
__decorate([
    common_1.Post(':name/photo'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfilePic", null);
__decorate([
    common_1.Get(':name/photo'),
    __param(0, common_1.Param('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getProfilePic", null);
__decorate([
    common_1.Post(':name/home-route'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateHomeRoute", null);
__decorate([
    common_1.Get(':name/home-route'),
    __param(0, common_1.Param('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getHomeRoute", null);
__decorate([
    common_1.Post(':name/profile'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfile", null);
__decorate([
    common_1.Post(':name/fullname'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateFullName", null);
__decorate([
    common_1.Post(':name/profile-name'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfileName", null);
__decorate([
    common_1.Post(':name/address'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateAddress", null);
__decorate([
    common_1.Post(':name/phone-number'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updatePhoneNumber", null);
__decorate([
    common_1.Post(':name/update-email'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateEmail", null);
__decorate([
    common_1.Post(':name/activate'),
    __param(0, common_1.Param('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "activate", null);
__decorate([
    common_1.Post(':name/deactivate'),
    __param(0, common_1.Param('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "dective", null);
__decorate([
    common_1.Post(':name/activation'),
    __param(0, common_1.Param('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateActivation", null);
__decorate([
    common_1.Post(':name/marital-status'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateMaritalStatus", null);
__decorate([
    common_1.Get(':name/is-active'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "isActive", null);
__decorate([
    common_1.Get(':name/is-locked'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "isLocked", null);
__decorate([
    common_1.Post(':name/lock'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "lock", null);
__decorate([
    common_1.Post(':name/unlock'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "unlock", null);
__decorate([
    common_1.Get(':name/auth-status'),
    __param(0, common_1.Param('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getAuthStatus", null);
__decorate([
    common_1.Get(':name/access-routes'),
    __param(0, common_1.Param('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getAccessRoutes", null);
__decorate([
    common_1.Get(':name/is-online'),
    __param(0, common_1.Param('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "isOnline", null);
__decorate([
    common_1.Get(':name/activities'),
    __param(0, common_1.Param('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getActivities", null);
__decorate([
    common_1.Post(':name/activities'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "addActivity", null);
__decorate([
    common_1.Post(':name/change-password'),
    __param(0, common_1.Param('name')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "changePassword", null);
UsersController = __decorate([
    common_1.Controller('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        auth_service_1.AuthService])
], UsersController);
exports.UsersController = UsersController;
//# sourceMappingURL=users.controller.js.map