create table if not exists opportunity (
    id bigserial primary key,
    title varchar(200) not null,
    short_description varchar(1000) not null,
    requirements text,
    company_name varchar(200) not null,
    type varchar(20) not null,
    work_format varchar(20) not null,
    employment_type varchar(20),
    grade varchar(20),
    salary_from integer,
    salary_to integer,
    published_at timestamptz not null,
    expires_at timestamptz,
    event_date date,
    city_id bigint,
    location_id bigint,
    contact_info text,
    status varchar(32) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint chk_opportunity_salary_range
    check (salary_from is null or salary_to is null or salary_from <= salary_to),
    constraint chk_event_requires_event_date
    check (type <> 'EVENT' or event_date is not null)
    );

create table if not exists tag (
    id bigserial primary key,
    name varchar(100) not null,
    category varchar(32) not null,
    created_by_type varchar(32) not null,
    is_active boolean not null default true,
    constraint uk_tag_name_category unique (name, category)
    );

create table if not exists opportunity_tag (
    opportunity_id bigint not null references opportunity(id) on delete cascade,
    tag_id bigint not null references tag(id),
    primary key (opportunity_id, tag_id)
    );

create table if not exists opportunity_resource_link (
    opportunity_id bigint not null references opportunity(id) on delete cascade,
    sort_order integer not null,
    url text not null,
    primary key (opportunity_id, sort_order)
    );

create index if not exists idx_opportunity_status_published_at
    on opportunity (status, published_at desc);

create index if not exists idx_opportunity_type_work_format
    on opportunity (type, work_format);

create index if not exists idx_opportunity_city_id
    on opportunity (city_id);

create index if not exists idx_opportunity_event_date
    on opportunity (event_date);

create index if not exists idx_opportunity_expires_at
    on opportunity (expires_at);

create index if not exists idx_opportunity_tag_tag_id
    on opportunity_tag (tag_id);

insert into tag (name, category, created_by_type, is_active)
values
    ('Java', 'TECH', 'SYSTEM', true),
    ('Kotlin', 'TECH', 'SYSTEM', true),
    ('Python', 'TECH', 'SYSTEM', true),
    ('SQL', 'TECH', 'SYSTEM', true),
    ('Spring', 'TECH', 'SYSTEM', true),
    ('React', 'TECH', 'SYSTEM', true),
    ('Intern', 'GRADE', 'SYSTEM', true),
    ('Junior', 'GRADE', 'SYSTEM', true),
    ('Middle', 'GRADE', 'SYSTEM', true),
    ('Full-time', 'EMPLOYMENT_TYPE', 'SYSTEM', true),
    ('Part-time', 'EMPLOYMENT_TYPE', 'SYSTEM', true),
    ('Project', 'EMPLOYMENT_TYPE', 'SYSTEM', true)
    on conflict do nothing;
