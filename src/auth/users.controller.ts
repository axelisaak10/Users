import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard, Permisos } from './permissions.guard';
import {
  CreateUserDto,
  UpdateUserDto,
  SearchUserQueryDto,
  AssignPermissionsDto,
  RemovePermissionsDto,
} from './dto/user-management.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permisos('superadmin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query() filters: SearchUserQueryDto) {
    return this.usersService.findAll(filters);
  }

  @Get('search')
  async search(@Query('q') q: string) {
    return this.usersService.findAll({ q });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto, @Req() req: any) {
    const adminEmail = req.user?.email || 'admin@system.com';
    return this.usersService.create(createUserDto, adminEmail);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Post(':id/change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user?.sub;
    return this.usersService.changePassword(id, adminId);
  }

  @Post(':id/permissions')
  @HttpCode(HttpStatus.OK)
  async assignPermissions(
    @Param('id') id: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ) {
    return this.usersService.assignPermissions(
      id,
      assignPermissionsDto.permisos,
    );
  }

  @Delete(':id/permissions')
  @HttpCode(HttpStatus.OK)
  async removePermissions(
    @Param('id') id: string,
    @Body() removePermissionsDto: RemovePermissionsDto,
  ) {
    return this.usersService.removePermissions(
      id,
      removePermissionsDto.permisos,
    );
  }

  @Get('permissions/list')
  @HttpCode(HttpStatus.OK)
  async getAllPermissions() {
    return this.usersService.getAllPermissions();
  }
}
