"""Unique constraint on timestamp and station_id

Revision ID: 284a310e0ff8
Revises: 1b0310b72f0b
Create Date: 2025-10-22 12:29:27.535445

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '284a310e0ff8'
down_revision: Union[str, Sequence[str], None] = '1b0310b72f0b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_unique_constraint(
        'uq_station_timestamp',
        'weather_observation',
        ['station_id', 'timestamp']
    )

def downgrade() -> None:
    op.drop_constraint(
        'uq_station_timestamp',
        'weather_observation',
        type_='unique'
    )
