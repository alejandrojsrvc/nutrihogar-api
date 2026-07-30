import { PartialType } from '@nestjs/swagger';
import { CreateAdultProfileRequestDto } from './create-adult-profile-request.dto';

export class UpdateAdultProfileRequestDto extends PartialType(CreateAdultProfileRequestDto) {}
