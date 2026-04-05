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
import { SseService } from './services/sse.service';
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
@Permisos('superadmin', 'user:manage')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly sseService: SseService,
  ) {}

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
  async suspend(@Param('id') id: string) {
    return this.usersService.suspendUser(id);
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
    const result = await this.usersService.assignPermissions(
      id,
      assignPermissionsDto.permisos,
    );
    
    this.sseService.broadcastToUser(id, 'permissions-updated', {
      permisos_globales: result.permisos_globales,
      permisos_globales_nombres: result.permisos_globales_nombres,
      timestamp: new Date().toISOString(),
    });
    
    return result;
  }

  @Delete(':id/permissions')
  @HttpCode(HttpStatus.OK)
  async removePermissions(
    @Param('id') id: string,
    @Body() removePermissionsDto: RemovePermissionsDto,
  ) {
    const result = await this.usersService.removePermissions(
      id,
      removePermissionsDto.permisos,
    );
    
    this.sseService.broadcastToUser(id, 'permissions-updated', {
      permisos_globales: result.permisos_globales,
      permisos_globales_nombres: result.permisos_globales_nombres,
      timestamp: new Date().toISOString(),
    });
    
    return result;
  }

  @Get('permissions/list')
  @HttpCode(HttpStatus.OK)
  async getAllPermissions() {
    return this.usersService.getAllPermissions();
  }
}
