import { PartialType } from '@nestjs/swagger';
import { CreateSeasonDto } from './create-season.dto';

// WHY: Extends CreateSeasonDto dynamically making all fields optional for partial updates.
// We use Swagger's PartialType to inherit OpenAPI definitions.
export class UpdateSeasonDto extends PartialType(CreateSeasonDto) {}
